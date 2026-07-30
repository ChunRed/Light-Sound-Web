"use client";

import { useEffect, useRef, useState } from "react";
import { LyriaPlayer, type PlayerStats } from "../lib/lyriaPlayer";
import { mapDataToLyria, type LyriaMappingResult } from "../lib/lyriaMapping";

interface SoundGeneratorProps {
  sRGB: number[];
  Wavelength: number[];
  Text: string | null;
}

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
// 對齊 neurips2026 的 APP_FORCE_MOCK：即使有金鑰也強制走 mock 合成音訊。
const FORCE_MOCK = process.env.NEXT_PUBLIC_FORCE_MOCK === "1";
// 自架 WebSocket proxy 位址（金鑰在後端、前端不需金鑰）。設了就優先走 proxy。
const PROXY_URL = process.env.NEXT_PUBLIC_LYRIA_PROXY_URL || "";
// 判定實際會用的來源：強制 mock → mock；否則有 proxy → proxy；否則有金鑰 → real_lyria；否則 mock。
const WILL_USE_PROXY = !FORCE_MOCK && !!PROXY_URL;
const WILL_USE_REAL = !FORCE_MOCK && !WILL_USE_PROXY && !!GEMINI_API_KEY;
const WILL_USE_MOCK = !WILL_USE_PROXY && !WILL_USE_REAL;

const STATUS_LABEL: Record<string, string> = {
  idle: "待機",
  connecting: "連線中…",
  buffering: "緩衝中…",
  playing: "播放中",
  paused: "已暫停",
  error: "錯誤",
};

/**
 * 聲音生成元件：以最新的 sRGB / Wavelength / Text 資料，透過 Google Lyria RealTime
 * 即時生成並串流播放音樂。此網頁會直接顯示在展示裝置上，點擊「開始生成聲音」後
 * 裝置即持續播放；感測資料變動時會即時重新調音（無需重新連線）。
 */
export default function SoundGenerator({
  sRGB,
  Wavelength,
  Text,
}: SoundGeneratorProps) {
  const playerRef = useRef<LyriaPlayer | null>(null);
  const [stats, setStats] = useState<PlayerStats>({
    status: "idle",
    source: WILL_USE_PROXY ? "proxy" : WILL_USE_MOCK ? "mock" : "real_lyria",
    bytesReceived: 0,
    chunksReceived: 0,
    queuedSeconds: 0,
    errorMessage: null,
  });
  const [mapping, setMapping] = useState<LyriaMappingResult | null>(null);
  const [volume, setVolume] = useState(0.9);

  // 預覽映射（未播放時也顯示「若開始播放會怎麼調音」）。
  const previewMapping = mapDataToLyria(sRGB, Wavelength, Text);
  const shown = mapping ?? previewMapping;

  // 建立單一 player 實例。
  useEffect(() => {
    playerRef.current = new LyriaPlayer({
      onStats: (s) => setStats(s),
      onMapping: (m) => setMapping(m),
    });
    return () => {
      playerRef.current?.stop();
      playerRef.current = null;
    };
  }, []);

  // light data（顏色 + 波長）變動 -> 只即時更新 Lyria 參數與冷/暖權重。
  // 與詩詞 prompt 為兩條獨立更新路徑，各自即時套用、互不等待。
  useEffect(() => {
    const p = playerRef.current;
    if (p && p.isRunning()) {
      p.updateSensorData(sRGB, Wavelength);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sRGB.join(","), Wavelength.join(",")]);

  // 詩詞變動 -> 只即時更新詩詞 prompt。
  useEffect(() => {
    const p = playerRef.current;
    if (p && p.isRunning()) {
      p.updatePoem(Text);
    }
  }, [Text]);

  const running =
    stats.status === "connecting" ||
    stats.status === "buffering" ||
    stats.status === "playing";

  const handleToggle = async () => {
    const p = playerRef.current;
    if (!p) return;
    if (running) {
      await p.stop();
    } else {
      await p.start(
        GEMINI_API_KEY,
        {
          sRGB,
          wavelength: Wavelength,
          text: Text,
        },
        FORCE_MOCK,
        PROXY_URL
      );
    }
  };

  const handleVolume = (v: number) => {
    setVolume(v);
    playerRef.current?.setVolume(v);
  };

  const statusDotColor =
    stats.status === "playing"
      ? "bg-emerald-400"
      : stats.status === "error"
      ? "bg-red-500"
      : running
      ? "bg-amber-400 animate-pulse"
      : "bg-neutral-600";

  const [r, g, b] = [sRGB?.[0] ?? 0, sRGB?.[1] ?? 0, sRGB?.[2] ?? 0];

  return (
    <div className="mt-8 p-5 bg-neutral-950/40 border border-neutral-900 rounded-xl font-mono text-xs text-neutral-300">
      {/* 標頭 */}
      <div className="flex items-center justify-between mb-4 border-b border-neutral-900 pb-3">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${statusDotColor}`} />
          <div>
            <div className="font-bold text-neutral-200 text-sm tracking-wider">
              聲音生成 · Lyria RealTime
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              由光影色彩即時轉譯為音樂 · 狀態：{STATUS_LABEL[stats.status] ?? stats.status}
              <span
                className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  stats.source === "real_lyria"
                    ? "bg-emerald-950/60 text-emerald-300"
                    : stats.source === "proxy"
                    ? "bg-violet-950/60 text-violet-300"
                    : "bg-sky-950/60 text-sky-300"
                }`}
              >
                {stats.source === "real_lyria"
                  ? "real_lyria"
                  : stats.source === "proxy"
                  ? "串流服務 (proxy)"
                  : "mock 合成"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={stats.status === "connecting"}
          className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
            running
              ? "bg-red-950/60 hover:bg-red-900/60 border border-red-900 text-red-300"
              : "bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800 text-emerald-300"
          }`}
        >
          {running ? "■ 停止聲音" : "▶ 開始生成聲音"}
        </button>
      </div>

      {/* mock 模式提示（無金鑰或強制 mock；仍可在 localhost 測整條映射管線與出聲）*/}
      {WILL_USE_MOCK && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-sky-950/30 border border-sky-900/50 text-sky-300/90 text-[10px] leading-relaxed">
          目前為 <span className="font-bold">mock 合成模式</span>
          {FORCE_MOCK
            ? "（NEXT_PUBLIC_FORCE_MOCK=1 強制）"
            : "（尚未設定 NEXT_PUBLIC_GEMINI_API_KEY）"}
          ：以感測資料驅動的正弦波在本機出聲，可測試整條光→聲映射管線。設定有效 Gemini 金鑰後即改用真實 Lyria RealTime 生成音樂。
        </div>
      )}
      {stats.status === "error" && stats.errorMessage && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-950/30 border border-red-900/50 text-red-300/90 text-[10px] leading-relaxed">
          {stats.errorMessage}
        </div>
      )}

      {/* 來源色彩 + 詩句 */}
      <div className="flex items-center gap-4 mb-5">
        <div
          className="w-11 h-11 rounded-lg border border-neutral-800 shadow-inner flex-shrink-0"
          style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
        />
        <div className="min-w-0">
          <div className="text-[10px] text-neutral-500 uppercase tracking-widest">
            當前光影音源 · rgb({r}, {g}, {b})
          </div>
          {Text ? (
            <p className="text-neutral-300 text-xs italic mt-1 truncate">「{Text}」</p>
          ) : (
            <p className="text-neutral-600 text-[10px] mt-1">尚無生成詩句，僅以色彩與波長調音</p>
          )}
        </div>
      </div>

      {/* 生成參數 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <ParamCard label="Brightness" value={shown.params.brightness} pct={shown.params.brightness * 100} />
        <ParamCard label="Density" value={shown.params.density} pct={shown.params.density * 100} />
        <ParamCard label="Guidance" value={shown.params.guidance} pct={(shown.params.guidance / 6) * 100} digits={2} />
        <ParamCard label="BPM" value={shown.params.bpm} pct={(shown.params.bpm / 140) * 100} digits={0} />
        <ParamCard label="Temp" value={shown.params.temperature} pct={(shown.params.temperature / 1.4) * 100} digits={2} />
      </div>

      {/* 加權提示詞 */}
      <div className="space-y-2 mb-5">
        <div className="text-[10px] text-neutral-500 uppercase tracking-widest">當前音樂提示詞</div>

        {/* 詩詞原文欄位（併入 prompt 的當前詩句，完整顯示不截斷）*/}
        <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-purple-950/20 border border-purple-900/40">
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 bg-purple-950/60 text-purple-300">
            詩詞原文
          </span>
          {Text ? (
            <p className="text-purple-200/90 text-[11px] leading-relaxed italic flex-1 min-w-0">
              「{Text}」
            </p>
          ) : (
            <p className="text-neutral-600 text-[10px] flex-1 min-w-0">
              尚無生成詩句，僅以色彩與波長調音
            </p>
          )}
        </div>

        {shown.prompts.map((p, i) => {
          const pct = Math.max(0, Math.min(100, p.weight * 100));
          const tag = i === 0 ? "冷" : i === 1 ? "暖" : "詩句";
          return (
            <div key={`${i}-${p.text}`} className="flex items-center gap-2">
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${
                  i === 0
                    ? "bg-sky-950/60 text-sky-300"
                    : i === 1
                    ? "bg-orange-950/60 text-orange-300"
                    : "bg-purple-950/60 text-purple-300"
                }`}
              >
                {tag}
              </span>
              <span className="text-neutral-400 text-[10px] flex-1 truncate">{p.text}</span>
              <span className="w-20 h-1 bg-neutral-800 rounded overflow-hidden flex-shrink-0">
                <span className="block h-full bg-neutral-500" style={{ width: `${pct}%` }} />
              </span>
              <span className="text-neutral-500 text-[10px] w-8 text-right flex-shrink-0">
                {p.weight.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* 音量 + 串流統計 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-3 border-t border-neutral-900/60">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[10px] text-neutral-500">音量</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolume(parseFloat(e.target.value))}
            className="flex-1 h-[3px] bg-neutral-800 rounded appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="text-[10px] text-neutral-500 w-8 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
        <div className="flex gap-4 text-[10px] text-neutral-500">
          <span>已接收 {(stats.bytesReceived / 1024).toFixed(0)} KB</span>
          <span>Chunks {stats.chunksReceived}</span>
          <span>佇列 {stats.queuedSeconds.toFixed(1)}s</span>
        </div>
      </div>
    </div>
  );
}

function ParamCard({
  label,
  value,
  pct,
  digits = 3,
}: {
  label: string;
  value: number;
  pct: number;
  digits?: number;
}) {
  return (
    <div className="bg-neutral-950/40 border border-neutral-900/60 rounded-lg p-2.5">
      <div className="text-[9px] text-neutral-500 uppercase tracking-wider">{label}</div>
      <div className="text-neutral-200 text-sm font-semibold mt-0.5">
        {value.toFixed(digits)}
      </div>
      <div className="mt-1.5 h-1 bg-neutral-800 rounded overflow-hidden">
        <div
          className="h-full bg-neutral-500"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}
