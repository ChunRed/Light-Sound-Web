// server/lyria-proxy.mjs
//
// Lyria RealTime 的 WebSocket 反向代理（persistent server，跑在你自己的機器上）。
//
// 用途：讓前端「不需要持有 Gemini 金鑰」也能聽到真 Lyria 音樂。
//   金鑰只存在本後端（GEMINI_API_KEY 環境變數），前端連本 proxy 的 WS，
//   proxy 代連 Google Lyria、把音訊 chunk 轉發回前端。取代「前端直連 Lyria」
//   會把 NEXT_PUBLIC_GEMINI_API_KEY inline 進 client bundle 而外洩的問題。
//
// 協議（前端 <-> 本 proxy，皆為 JSON 文字訊息）：
//   前端送:
//     { type: "start" }                                        建立 Lyria session 並 play()
//     { type: "prompts", weightedPrompts: [{text,weight}...] } 設定加權提示詞
//     { type: "config",  musicGenerationConfig: {...} }        設定 brightness/density/bpm...
//     { type: "stop" }                                         停止並關閉 session
//   proxy 回:
//     { type: "status", status: "connecting|playing|error", message? }
//     { type: "audio",  data: "<base64 s16le 48kHz stereo PCM>" }
//
// 啟動：
//   GEMINI_API_KEY=xxx node server/lyria-proxy.mjs           # 預設 port 8790
//   GEMINI_API_KEY=xxx LYRIA_PROXY_PORT=8790 node server/lyria-proxy.mjs

import { WebSocketServer } from "ws";
import { GoogleGenAI } from "@google/genai";

const PORT = Number(process.env.LYRIA_PROXY_PORT || 8790);
const HOST = process.env.LYRIA_PROXY_HOST || "127.0.0.1";
const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const MODEL_ID = "models/lyria-realtime-exp";

if (!API_KEY) {
  console.error(
    "[lyria-proxy] 缺少 GEMINI_API_KEY 環境變數，無法代連 Lyria。請以 GEMINI_API_KEY=xxx 啟動。"
  );
  process.exit(1);
}

const wss = new WebSocketServer({ host: HOST, port: PORT });
console.log(`[lyria-proxy] WebSocket proxy listening on ws://${HOST}:${PORT}`);

wss.on("connection", (client, req) => {
  const peer = req.socket.remoteAddress;
  console.log(`[lyria-proxy] client connected: ${peer}`);

  // 每個前端連線對應一個獨立的 Lyria session（一個 GoogleGenAI client 亦可共用，
  // 但為隔離失敗與生命週期，此處各自建立）。
  const ai = new GoogleGenAI({ apiKey: API_KEY, httpOptions: { apiVersion: "v1alpha" } });
  let session = null;
  let closed = false;
  // 記錄是否已下發過 prompts 與 config，且是否已呼叫過 play()。
  // 對齊前端原本會出聲的順序：先 setWeightedPrompts + setMusicGenerationConfig 再 play()，
  // 否則 Lyria 只會送 setupComplete、之後靜默不吐音訊。
  let hasPrompts = false;
  let hasConfig = false;
  let started = false;
  // client 可能在 session 尚未建好前就送 prompts/config，先暫存於此。
  let pendingPrompts = null;
  let pendingConfig = null;

  const send = (obj) => {
    if (client.readyState === client.OPEN) {
      try {
        client.send(JSON.stringify(obj));
      } catch {}
    }
  };

  const maybePlay = () => {
    if (started || !session || !hasPrompts || !hasConfig) return;
    try {
      session.play();
      started = true;
      send({ type: "status", status: "playing" });
      console.log(`[lyria-proxy] play() called for ${peer} (after prompts+config)`);
    } catch (e) {
      console.warn(`[lyria-proxy] play() failed for ${peer}:`, e?.message || e);
    }
  };

  const startSession = async () => {
    if (session) return;
    send({ type: "status", status: "connecting" });
    try {
      session = await ai.live.music.connect({
        model: MODEL_ID,
        callbacks: {
          onmessage: (message) => {
            const chunks = message?.serverContent?.audioChunks;
            if (!chunks || chunks.length === 0) return;
            for (const chunk of chunks) {
              const data = chunk?.data;
              if (data) send({ type: "audio", data });
            }
          },
          onerror: (err) => {
            send({ type: "status", status: "error", message: err?.message || "Lyria 連線錯誤" });
          },
          onclose: () => {
            if (!closed) send({ type: "status", status: "idle" });
          },
        },
      });
      // 不立刻 play()：等 prompts + config 都到齊才 play()（與前端原本能出聲的順序一致）。
      console.log(`[lyria-proxy] Lyria session connected for ${peer}（等 prompts+config 後才 play）`);
      // 若 client 已早於 session 送過 prompts/config，這裡把 pending 補下發。
      try {
        if (pendingPrompts) {
          await session.setWeightedPrompts({ weightedPrompts: pendingPrompts });
          hasPrompts = true;
          pendingPrompts = null;
        }
        if (pendingConfig) {
          await session.setMusicGenerationConfig({ musicGenerationConfig: pendingConfig });
          hasConfig = true;
          pendingConfig = null;
        }
      } catch (e) {
        console.warn(`[lyria-proxy] 補下發 pending 失敗:`, e?.message || e);
      }
      maybePlay();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      send({ type: "status", status: "error", message: msg || "無法建立 Lyria session" });
      console.error(`[lyria-proxy] start failed for ${peer}:`, msg);
    }
  };

  client.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    try {
      switch (msg?.type) {
        case "start":
          await startSession();
          break;
        case "prompts":
          if (Array.isArray(msg.weightedPrompts)) {
            if (session) {
              await session.setWeightedPrompts({ weightedPrompts: msg.weightedPrompts });
              hasPrompts = true;
              maybePlay();
            } else {
              // session 還沒建好，先暫存，等 startSession 完成後補下發。
              pendingPrompts = msg.weightedPrompts;
            }
          }
          break;
        case "config":
          if (msg.musicGenerationConfig) {
            if (session) {
              await session.setMusicGenerationConfig({
                musicGenerationConfig: msg.musicGenerationConfig,
              });
              hasConfig = true;
              maybePlay();
            } else {
              pendingConfig = msg.musicGenerationConfig;
            }
          }
          break;
        case "stop":
          closeSession();
          break;
        default:
          break;
      }
    } catch (e) {
      // 下發失敗不致命（session 可能剛關閉）。
      console.warn(`[lyria-proxy] handle "${msg?.type}" failed:`, e?.message || e);
    }
  });

  const closeSession = () => {
    if (session) {
      try {
        session.stop?.();
      } catch {}
      try {
        session.close?.();
      } catch {}
      session = null;
    }
  };

  client.on("close", () => {
    closed = true;
    closeSession();
    console.log(`[lyria-proxy] client disconnected: ${peer}`);
  });
  client.on("error", () => {
    closed = true;
    closeSession();
  });
});

wss.on("error", (e) => {
  console.error("[lyria-proxy] server error:", e?.message || e);
});
