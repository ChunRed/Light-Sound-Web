// lib/lyriaPlayer.ts
//
// 瀏覽器端 Lyria RealTime 客戶端 + Web Audio 播放。
//
// 資料流：
//   @google/genai  ai.live.music.connect(lyria-realtime-exp)
//     -- WebSocket --> serverContent.audioChunks[].data (base64 s16le 48kHz stereo PCM)
//     -- 本模組解碼 --> AudioBuffer 排程接續播放（gapless scheduling）
//
// 參數更新走 mapDataToLyria() 產出的 setWeightedPrompts / setMusicGenerationConfig。
//
// 金鑰：NEXT_PUBLIC_GEMINI_API_KEY（沿用網頁既有慣例；純前端展示裝置用途）。
// Lyria 為實驗功能，client 必須以 apiVersion: "v1alpha" 初始化。

"use client";

import {
  GoogleGenAI,
  type LiveMusicSession,
  type LiveMusicServerMessage,
} from "@google/genai";
import {
  mapDataToLyria,
  type LyriaMappingResult,
  type WeightedPromptSpec,
} from "./lyriaMapping";

const MODEL_ID = "models/lyria-realtime-exp";
const LYRIA_SAMPLE_RATE = 48000;
const LYRIA_CHANNELS = 2;

// 音訊來源旗標（對齊 neurips2026 app.py 的 source=mock / real_lyria）：
// - real_lyria：有 GEMINI_API_KEY 且未強制 mock → 真連 Lyria。
// - mock：無金鑰或強制 mock → 瀏覽器端合成感測驅動正弦波（離線亦可測整條管線）。
export type AudioSource = "mock" | "real_lyria";

export type PlayerStatus =
  | "idle"
  | "connecting"
  | "buffering"
  | "playing"
  | "paused"
  | "error";

export interface PlayerStats {
  status: PlayerStatus;
  source: AudioSource;
  bytesReceived: number;
  chunksReceived: number;
  queuedSeconds: number;
  errorMessage: string | null;
}

export interface SensorSnapshot {
  sRGB: number[];
  wavelength: number[];
  text: string | null;
}

interface LyriaPlayerCallbacks {
  onStats?: (stats: PlayerStats) => void;
  onMapping?: (mapping: LyriaMappingResult) => void;
}

// base64 -> Uint8Array（瀏覽器 atob）。
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const len = bin.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export class LyriaPlayer {
  private ai: GoogleGenAI | null = null;
  private session: LiveMusicSession | null = null;
  private audioCtx: AudioContext | null = null;
  private gain: GainNode | null = null;

  // mock 合成音訊（無金鑰時的離線測試路徑，對齊 neurips2026 MockPCMSource）。
  private osc: OscillatorNode | null = null;
  private oscGain: GainNode | null = null;
  private mockTimer: ReturnType<typeof setInterval> | null = null;
  private mockStartMs = 0;

  private source: AudioSource = "mock";
  private status: PlayerStatus = "idle";
  private bytesReceived = 0;
  private chunksReceived = 0;
  private errorMessage: string | null = null;

  // gapless scheduling：nextStartTime 追蹤下一段 buffer 應排入的 audioCtx 時間。
  private nextStartTime = 0;
  private readonly initialBufferSec = 2.0; // 起播前先累積約 2s 緩衝避免破音

  private latest: SensorSnapshot | null = null;
  private cb: LyriaPlayerCallbacks;

  constructor(callbacks: LyriaPlayerCallbacks = {}) {
    this.cb = callbacks;
  }

  private setStatus(s: PlayerStatus) {
    this.status = s;
    this.emitStats();
  }

  private emitStats() {
    const queuedSeconds =
      this.audioCtx && this.nextStartTime > this.audioCtx.currentTime
        ? this.nextStartTime - this.audioCtx.currentTime
        : 0;
    this.cb.onStats?.({
      status: this.status,
      source: this.source,
      bytesReceived: this.bytesReceived,
      chunksReceived: this.chunksReceived,
      queuedSeconds: Math.round(queuedSeconds * 100) / 100,
      errorMessage: this.errorMessage,
    });
  }

  isRunning(): boolean {
    return (
      this.status === "connecting" ||
      this.status === "buffering" ||
      this.status === "playing"
    );
  }

  /** 更新最新感測資料並即時套用（Lyria session 或 mock 合成皆會反應）。 */
  async updateSensors(snapshot: SensorSnapshot) {
    this.latest = snapshot;
    if (this.session) {
      await this.applyMapping(snapshot);
    } else if (this.source === "mock" && this.isRunning()) {
      this.applyMockMapping(snapshot);
    }
  }

  private async applyMapping(snapshot: SensorSnapshot) {
    const session = this.session;
    if (!session) return;
    const mapping = mapDataToLyria(
      snapshot.sRGB,
      snapshot.wavelength,
      snapshot.text
    );
    this.cb.onMapping?.(mapping);
    try {
      await session.setWeightedPrompts({
        weightedPrompts: normalizePrompts(mapping.prompts),
      });
      await session.setMusicGenerationConfig({
        musicGenerationConfig: {
          brightness: mapping.params.brightness,
          density: mapping.params.density,
          guidance: mapping.params.guidance,
          bpm: mapping.params.bpm,
          temperature: mapping.params.temperature,
        },
      });
    } catch (e) {
      // 參數下發失敗不致命（session 可能剛關閉）；記錄即可。
      console.warn("[LyriaPlayer] applyMapping failed:", e);
    }
  }

  /**
   * 決定音訊來源並開始播放：
   * - 有 apiKey 且 forceMock=false → 真連 Lyria (source=real_lyria)
   * - 否則 → 瀏覽器合成正弦波 (source=mock)，離線亦可測整條映射管線
   */
  async start(
    apiKey: string,
    snapshot: SensorSnapshot,
    forceMock = false
  ) {
    if (this.isRunning()) return;
    this.latest = snapshot;
    this.errorMessage = null;
    this.bytesReceived = 0;
    this.chunksReceived = 0;

    const useReal = !!apiKey && !forceMock;
    this.source = useReal ? "real_lyria" : "mock";
    this.setStatus("connecting");

    // AudioContext 以 48kHz 建立，與 Lyria 輸出一致避免重採樣失真。
    const Ctor: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.audioCtx = new Ctor({ sampleRate: LYRIA_SAMPLE_RATE });
    this.gain = this.audioCtx.createGain();
    this.gain.gain.value = 1.0;
    this.gain.connect(this.audioCtx.destination);
    if (this.audioCtx.state === "suspended") await this.audioCtx.resume();
    this.nextStartTime = 0;

    if (!useReal) {
      this.startMock(snapshot);
      return;
    }

    try {
      // Lyria 為實驗功能，須以 v1alpha 初始化（apiVersion 位於 httpOptions 內）。
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: { apiVersion: "v1alpha" },
      });
      this.session = await this.ai.live.music.connect({
        model: MODEL_ID,
        callbacks: {
          onmessage: (message: LiveMusicServerMessage) => this.onMessage(message),
          onerror: (err: ErrorEvent) => {
            this.errorMessage = err?.message || "Lyria 連線錯誤";
            this.setStatus("error");
          },
          onclose: () => {
            if (this.status !== "error") this.setStatus("idle");
          },
        },
      });

      await this.applyMapping(snapshot);
      // play() 為同步方法（回傳 void）。
      this.session.play();
      this.setStatus("buffering");
    } catch (e) {
      this.errorMessage =
        (e instanceof Error ? e.message : String(e)) || "無法建立 Lyria session";
      this.setStatus("error");
      this.cleanupAudio();
    }
  }

  // --- mock 合成路徑（對齊 neurips2026 MockPCMSource：頻率隨 brightness、音量隨 density）---
  private startMock(snapshot: SensorSnapshot) {
    if (!this.audioCtx || !this.gain) return;
    this.osc = this.audioCtx.createOscillator();
    this.osc.type = "sine";
    this.oscGain = this.audioCtx.createGain();
    this.oscGain.gain.value = 0.0001;
    this.osc.connect(this.oscGain);
    this.oscGain.connect(this.gain);
    this.osc.start();
    this.mockStartMs = performance.now();

    this.applyMockMapping(snapshot);
    // 統計「已接收」以合成速率近似（48000×2×2 bytes/s），供 UI 顯示與真實路徑一致。
    this.mockTimer = setInterval(() => {
      const elapsed = (performance.now() - this.mockStartMs) / 1000;
      this.bytesReceived = Math.round(elapsed * LYRIA_SAMPLE_RATE * LYRIA_CHANNELS * 2);
      this.chunksReceived = Math.round(elapsed * 50); // ~20ms/frame
      this.emitStats();
    }, 200);
    this.setStatus("playing");
  }

  private applyMockMapping(snapshot: SensorSnapshot) {
    const mapping = mapDataToLyria(
      snapshot.sRGB,
      snapshot.wavelength,
      snapshot.text
    );
    this.cb.onMapping?.(mapping);
    if (!this.audioCtx || !this.osc || !this.oscGain) return;
    const now = this.audioCtx.currentTime;
    // 頻率 220..660Hz 隨 brightness；音量隨 density（保持柔和上限）。
    const freq = 220 + 440 * mapping.params.brightness;
    const amp = 0.04 + 0.22 * mapping.params.density;
    this.osc.frequency.setTargetAtTime(freq, now, 0.3);
    this.oscGain.gain.setTargetAtTime(amp, now, 0.3);
  }

  private onMessage(message: LiveMusicServerMessage) {
    const chunks = message?.serverContent?.audioChunks;
    if (!chunks || chunks.length === 0) return;
    for (const chunk of chunks) {
      const data: string | undefined = chunk?.data;
      if (!data) continue;
      const bytes = base64ToBytes(data);
      this.bytesReceived += bytes.byteLength;
      this.chunksReceived += 1;
      this.scheduleChunk(bytes);
    }
    this.emitStats();
  }

  // 把一段 s16le interleaved stereo PCM 解碼為 AudioBuffer 並排入播放佇列。
  private scheduleChunk(bytes: Uint8Array) {
    if (!this.audioCtx || !this.gain) return;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const nFrames = Math.floor(bytes.byteLength / (2 * LYRIA_CHANNELS));
    if (nFrames <= 0) return;

    const buffer = this.audioCtx.createBuffer(
      LYRIA_CHANNELS,
      nFrames,
      LYRIA_SAMPLE_RATE
    );
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    for (let i = 0; i < nFrames; i++) {
      const l = view.getInt16(i * 4, true);
      const r = view.getInt16(i * 4 + 2, true);
      left[i] = l / 32768;
      right[i] = r / 32768;
    }

    const src = this.audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.gain);

    const now = this.audioCtx.currentTime;
    // 初次排程：先預留 initialBufferSec 緩衝再起播。
    if (this.nextStartTime < now + 0.05) {
      this.nextStartTime = now + this.initialBufferSec;
    }
    src.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;

    if (this.status === "buffering" && this.nextStartTime - now >= this.initialBufferSec) {
      this.setStatus("playing");
    }
  }

  setVolume(v: number) {
    if (this.gain) this.gain.gain.value = Math.max(0, Math.min(1, v));
  }

  async stop() {
    if (this.mockTimer) {
      clearInterval(this.mockTimer);
      this.mockTimer = null;
    }
    if (this.osc) {
      try {
        this.osc.stop();
      } catch {}
      try {
        this.osc.disconnect();
      } catch {}
      this.osc = null;
    }
    if (this.oscGain) {
      try {
        this.oscGain.disconnect();
      } catch {}
      this.oscGain = null;
    }
    if (this.session) {
      try {
        this.session.stop?.();
      } catch {}
      try {
        this.session.close?.();
      } catch {}
      this.session = null;
    }
    this.ai = null;
    this.cleanupAudio();
    this.setStatus("idle");
  }

  private cleanupAudio() {
    if (this.gain) {
      try {
        this.gain.disconnect();
      } catch {}
      this.gain = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
    this.nextStartTime = 0;
  }
}

// 正規化權重（總和 -> 1），避免整體權重過大或過小。
function normalizePrompts(prompts: WeightedPromptSpec[]): WeightedPromptSpec[] {
  const total = prompts.reduce((a, p) => a + Math.max(0, p.weight), 0);
  if (total <= 0) return prompts.map((p) => ({ ...p, weight: 1 / prompts.length }));
  return prompts.map((p) => ({
    text: p.text,
    weight: Math.round((Math.max(0, p.weight) / total) * 1e4) / 1e4,
  }));
}
