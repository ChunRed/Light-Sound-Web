<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Light-Sound-Web — Agent 開發指南 (AGENTS.md)

本檔是 AI 代理接手本專案的權威操作說明。**每次完成一項實作後請同步更新此檔。**

## 1. 專案定位

- **用途**：把光感測器（AS7341 8 通道 + Clear）讀到的光譜資料，即時視覺化為色彩矩陣，並：
  1. 用 Gemini 產生「色彩感知」的繁體中文微型詩句（文字）。
  2. 用 **Google Lyria RealTime** 把「顏色 + 波長 + 詩句」即時轉譯為**串流音樂**（聲音）。
- **部署**：Next.js（**16.2.9，webpack**）App Router，前端純 client component 為主，部署於 **Vercel**（線上：https://light-sound-web.vercel.app）。
- **展示情境**：此網頁會**直接顯示在裝置上讓裝置播放聲音**。使用者開啟頁面 → 資料進來 → 點「開始生成聲音」→ 裝置持續播放，感測資料變動時即時重新調音（不重連）。
- **框架版本警語**：見檔頭 nextjs-agent-rules。動 Next 相關結構前先讀 `node_modules/next/dist/docs/`。

## 2. 執行與驗證指令

```bash
cd /home/ubuntu/tkwang/Light-Sound-Web

npm install                 # 安裝相依（含 @google/genai for Lyria）
npm run dev                 # 開發伺服器 http://localhost:3000（next dev --webpack）
npm run build               # 正式建置（next build --webpack）— 交付前必跑
npx tsc --noEmit            # 型別檢查
npx eslint <files>          # lint（build 會強制 lint，any / 未用變數會 fail）
```

- **本機建置會因缺 Supabase 環境變數而 prerender fail**（`supabaseUrl is required`）——這是**既有**行為，非新程式碼造成。本機驗證請建 `.env.local`（已被 .gitignore 忽略）填佔位值即可通過（見第 4 節）。Vercel 上有真實環境變數故正常建置。

## 2.5 音樂生成頁與 localhost 測試（重要）

### 頁面
- **`/music-generation`**（`app/music-generation/page.tsx`）：**deploy 上線頁**。讀真實 Supabase 最新一筆光感測資料（與主頁同色彩轉換 + realtime 訂閱 + 抓對應 AI 詩句），交給 `SoundGenerator` 生成/播放。裝置直接開此頁 → 點「開始生成聲音」→ 持續播放，感測更新即時重新調音。無資料時顯示「讀取最新光感測資料中…」。
- 主頁 `/` 仍是色彩矩陣視覺化（既有），聲音元件同時掛在主頁的 `DatabaseEmit` 下與此獨立頁。

### 兩種音訊來源（對齊 neurips2026 的 source=mock / real_lyria）
- **mock 合成**（無金鑰即可）：`SoundGenerator` 在**無 `NEXT_PUBLIC_GEMINI_API_KEY`** 或 **`NEXT_PUBLIC_FORCE_MOCK=1`** 時，用瀏覽器 Web Audio 合成一個「感測驅動的正弦波」（頻率隨 brightness、音量隨 density），**不需金鑰、離線也能出聲**，用來驗證整條「光→聲」映射管線與 UI。等同 neurips2026 的 `APP_FORCE_MOCK=1`。
- **real_lyria**（要真音樂）：設定有效 `NEXT_PUBLIC_GEMINI_API_KEY`（且未強制 mock）→ 真連 Google Lyria RealTime 串流生成。金鑰於 [AI Studio](https://aistudio.google.com/apikey) 取得（支援免費金鑰）。

### 測試步驟
```bash
# 1. 起 dev server
cd /home/ubuntu/tkwang/Light-Sound-Web && npm run dev

# 2. 開頁 http://localhost:3000/music-generation → 點「開始生成聲音」
#    本機無真實 Supabase 資料時此頁停在「讀取中…」（deploy 上有真實資料則正常掛載）。
#    若要在本機用「合成假資料」快速試聲音管線，可暫時建一個讀 osc() 假資料的頁面（見 git 歷史的 localtest）。
```
- **一定要「點擊」按鈕才會出聲**：瀏覽器 autoplay 政策要求使用者手勢後才能啟動 AudioContext。
- UI 標頭會顯示來源徽章（`mock 合成` / `real_lyria`）與狀態（待機/緩衝中/播放中）。

### ⚠️ 踩坑：localhost 打不開 / 按鈕點了沒反應 = `allowedDevOrigins` 沒放 localhost
`next.config.ts` 的 `allowedDevOrigins` **必須含 `localhost` / `127.0.0.1`（含 :3000）**。Next 16 若來源不在清單，會**擋掉 `/_next/webpack-hmr` 與客戶端 runtime chunk**，導致頁面 render 出來但**無法 hydrate**（React fiber 未附著、`onClick` 不觸發、按鈕像死鈕）。dev log 會出現 `⚠ Blocked cross-origin request to Next.js dev resource ... from "127.0.0.1"`。修法：把 `localhost`/`127.0.0.1` 加進 `allowedDevOrigins` 後**重啟 dev server**（config 改動需重啟）。判斷 hydrate 是否成功：console 執行 `Object.keys(document.querySelector('button')).some(k=>k.startsWith('__reactFiber'))` 應為 true。

### 遠端機（本機無喇叭）要真正「聽到」
此開發機是無頭 remote，`localhost:3000` 跑在伺服器上、Cursor 內建瀏覽器不發聲。要在你自己的電腦聽：
- SSH port forward：`ssh -L 3000:localhost:3000 使用者@伺服器`，再在你電腦開 `http://localhost:3000/music-generation`。
- 或 `next dev -H 0.0.0.0` 綁對外 + 同網段用伺服器 IP 連（記得該 IP 也要進 `allowedDevOrigins`）。

## 3. 專案結構

```
app/
  layout.tsx              # RootLayout（Geist 字型）
  page.tsx                # 主頁：色彩矩陣視覺化 + Gemini 詩句生成（既有；本次未改邏輯）
                          #   讀 Supabase LightDate 表 → convertToRGB → 顯示 400 格色彩
                          #   對最新一筆自動呼叫 Gemini 產生詩句，寫入 aiSupabase.ai_descriptions
  globals.css
lib/
  supabase.ts             # 兩個 Supabase client：supabase(主，光資料)、aiSupabase(詩句)
  lyriaMapping.ts         # 【聲音】純函式：sRGB/Wavelength/Text → Lyria 參數 + 加權提示詞（可獨立測試）
  lyriaPlayer.ts          # 【聲音】瀏覽器端 Lyria RealTime client + Web Audio PCM 播放（class LyriaPlayer）
components/
  ColorGui.tsx            # 右下角色彩參數面板（權重/明度/對比…；既有）
  LatestCalibratedColor.tsx  # 讀最新一筆 → 算出 sRGB/Wavelength/Text → 渲染 <DatabaseEmit>
  DatabaseEmit.tsx        # 接收 sRGB/Wavelength/Text 三種資料；本次改為 render <SoundGenerator>
  SoundGenerator.tsx      # 【聲音】聲音生成 UI（播放/停止、音量、即時參數/提示詞、統計、mock/real 來源標）
app/music-generation/page.tsx  # 【聲音】音樂生成頁 /music-generation：讀真實 Supabase 最新光感測資料 → SoundGenerator（deploy 上線頁，裝置直接開此頁播放）
ESP32-Code/               # 感測器韌體（Light-Sensor.ino）
```

### 三種資料（來源在 DatabaseEmit 的 props，由 LatestCalibratedColor 計算）
- `sRGB: number[]` 顏色資料 `[r, g, b]`（0..255，經 ColorGui 校正後的顯示色）。
- `Wavelength: number[]` 波長資料 `[f1..f8]`（AS7341 8 通道 415/445/480/515/555/590/630/680nm 原始 counts）。
- `Text: string | null` AI 生成的繁中微型詩句（可能為 null，此時僅以色彩/波長調音）。

## 4. 聲音生成機制（本次新增，核心）

**資料流**：
```
LatestCalibratedColor  --(sRGB / Wavelength / Text)-->  DatabaseEmit  -->  SoundGenerator
  SoundGenerator --> LyriaPlayer.start()/updateSensors()
    LyriaPlayer --> mapDataToLyria()  (lib/lyriaMapping.ts)
                --> @google/genai  ai.live.music.connect("models/lyria-realtime-exp")
                --(WebSocket)--> serverContent.audioChunks[].data (base64 s16le 48kHz stereo PCM)
                --(base64 解碼 + Web Audio 排程接續播放)--> 裝置喇叭
```

### 參數映射（`lib/lyriaMapping.ts`，純函式）
| 輸入 | → Lyria | 說明 |
|---|---|---|
| sRGB 感知亮度 (Rec.601 luma) | `brightness` (0..1) | 越亮音色越明亮；下限 0.05 |
| 波長頻譜相鄰通道起伏 | `density` (0..1) | 頻譜越崎嶇音符越密 |
| 波長頻譜熵（反比） | `guidance` (1..6) | 熵高→更發散→guidance 低 |
| 暖簇(F5-F8)主導度 | `bpm` (72..108) | 暖色偏慢、冷色偏快（chill 區間） |
| 亮度 | `temperature` (0.9..1.3) | 越亮越活潑 |
| 冷簇 F1-F4 / 暖簇 F5-F8 能量比 | 兩條加權 prompt | 冷=ethereal ambient / 暖=lo-fi soulful，權重=能量佔比（保底 0.1） |
| Text 詩句 | 一條情緒 prompt (權重 0.55) | 含蓄引導音色貼合當下光影心境；null 則略過 |

- 權重下發前會**正規化到總和 1**（`normalizePrompts`）。波長全 0 時退回用 RGB 冷暖傾向估冷/暖權重。

### Lyria SDK 要點（@google/genai 2.11.0，實作時踩過）
- Lyria 為**實驗功能**，client 必須以 `httpOptions: { apiVersion: "v1alpha" }` 初始化（**不是**頂層 `apiVersion` 選項）。
- `session.play()` / `pause()` / `stop()` / `resetContext()` 皆為**同步方法（回傳 void）**，勿當 Promise await（await 無害但語意錯）。
- `setWeightedPrompts({ weightedPrompts })` / `setMusicGenerationConfig({ musicGenerationConfig })` 才是 async。
- 音訊 chunk 是 **base64 s16le 48kHz stereo PCM**：`atob` → Uint8Array → DataView `getInt16(i, true)` /32768 → AudioBuffer；用 `AudioContext({ sampleRate: 48000 })` 避免重採樣，`AudioBufferSourceNode` 依 `nextStartTime` 排程接續播放（gapless），起播前先累積約 2s 緩衝避免破音。
- `LiveMusicGenerationConfig` 有效欄位：`brightness`/`density`(0..1)、`guidance`(0..6)、`bpm`(60..200)、`temperature`(0..3)、topK/seed/scale/mute* 等。

### 金鑰與環境變數
- Lyria 走前端 `NEXT_PUBLIC_GEMINI_API_KEY`（沿用網頁既有的公開金鑰慣例；純展示裝置用途）。**未設定時 SoundGenerator 走 mock 合成模式（藍色提示）**、不會 crash。
- `NEXT_PUBLIC_FORCE_MOCK=1`：即使有金鑰也強制 mock 合成（對齊 neurips2026 `APP_FORCE_MOCK`），供離線/無金鑰測試。
- 本機驗證 `.env.local`（.gitignore 已忽略；勿進版控）：
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://placeholder-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
  NEXT_PUBLIC_AI_SUPABASE_URL=https://placeholder-ai-project.supabase.co
  NEXT_PUBLIC_AI_SUPABASE_ANON_KEY=placeholder-ai-anon-key
  NEXT_PUBLIC_GEMINI_API_KEY=            # 留空→mock 合成；填有效金鑰→真實 Lyria
  # NEXT_PUBLIC_FORCE_MOCK=1             # 可選：強制 mock 合成
  ```
- 正式：在 Vercel 專案環境變數設定真實值（含有效 Gemini 金鑰）。

## 5. 慣例與踩坑

- **build 會強制 ESLint**：`@typescript-eslint/no-explicit-any`、未使用變數皆為 **error** 會讓 `next build` 失敗。用 `@google/genai` 提供的型別（`LiveMusicSession`/`LiveMusicServerMessage`/`ErrorEvent`）取代 `any`；catch 未用參數寫 `catch {}`（無參數）。
- **驗證 SoundGenerator UI**：主頁的 SoundGenerator 只在 Supabase 有資料時（`LatestCalibratedColor` 拿到最新一筆）才掛載；本機無真實 Supabase 時主頁停在「讀取中…」。要單獨驗 UI 可暫時建一個 `app/verify/page.tsx`（**勿用 `_verify`——底線開頭是 Next 私有資料夾會 404**）以 mock 資料掛載 SoundGenerator，截圖後刪除。
- **勿把建置產物進版控**：`tsconfig.tsbuildinfo`、`.next/` 皆 build 產物；`next-env.d.ts` 由 Next 自動維護（build 後可能被加 routes 參考，屬正常）。
- **不動主頁既有邏輯**：色彩視覺化與 Gemini 詩句生成（`app/page.tsx`）已上線，本次只「接上聲音」——透過既有的 `DatabaseEmit`（資料匯集點）render `SoundGenerator`，不改資料流上游。
- **原本的 NeurIPS 網頁（`../neurips2026/web`，port 3000）與本專案無關**：它是 Python 後端 + WebSocket 版的 Lyria；本專案改為**純前端直連 Lyria**（Vercel 無自架後端）。該網頁已依需求停掉、不再更新。

## 6. 交付前檢查（UI 交付驗收）

1. **建置**：`npm run build` 過（本機以 `.env.local` 佔位值通過 prerender）。
2. **型別/lint**：`npx tsc --noEmit` 0 error；`next build` 內的 ESLint 0 error。
3. **可互動**：SoundGenerator「開始/停止聲音」按鈕、音量滑桿可操作；缺金鑰顯示提示而非死鈕/crash。
4. **參數正確**：即時參數（brightness/density/guidance/bpm/temp）與加權提示詞隨 sRGB/Wavelength/Text 變動而更新（暖色→暖 prompt 權重高、bpm 低）。
5. **Web 實機**：dev/prod 開啟 0 runtime error；有有效金鑰時點播放能持續串流播放音訊。
