"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface LightData {
  id: number;
  created_at: string;
  f1_415nm: number;
  f2_445nm: number;
  f3_480nm: number;
  f4_515nm: number;
  f5_555nm: number;
  f6_590nm: number;
  f7_630nm: number;
  f8_680nm: number;
  clear_luminous: number;
}

const API_KEY = "AIzaSyB3GET3bkEnIXfp9bhcoGplFNtWE8uDzgU"; 
const genAI = new GoogleGenerativeAI(API_KEY);

// 文字生成指令
const finalSystemInstruction = `
# Role & Context
你是一位擅長色彩現象學的當代藝術家。你的任務是將輸入的生冷 RGB 數據，結合當下環境的【實際時段條件】，轉譯為一段兼具文學隱喻、生活親民度與主觀感官體驗的繁體中文微型詩句。
窗外的光線每分每秒都在生滅流轉。請將 RGB 數值與時段視為此時此刻的光影碎片，想像一段沉浸在該色彩空間中的主觀體驗，捕捉那一瞬間的心理投射、感官停滯或呼吸。

# Tone & Style Guidelines
1. 平易近人，拒絕艱澀：文字語氣必須親民，聚焦於大眾在日常生活中（房間、街道、身體局部）都能直覺體會的身體感知與空間細節。
* 【嚴禁造作詞彙】：絕對禁止使用「沉降、罅隙、熔煉、虛無、黏稠、未竟、神聖、宇宙、巨觀、興衰、終結」等過於華麗、冷僻或宏大的造作詞彙。
2. 句型多樣化（反公式化）：
* 嚴禁每一句回應都以比喻詞開頭。嚴格限制「像是」、「彷彿」、「如同」、「好比」等詞彙的使用頻率。
* 必須動態輪替、交替使用不同的句型結構（如直接敘事、感官倒裝、動作帶入）。
3. 隱性時空防禦（淡化時間詞彙）：不需要、也不應該在每句話中都生硬地提到時間或照明器具。文字應優先聚焦於「純粹的感官與物質質地」（例如：溫度、氣味、皮膚觸感、視線停滯）。**嚴格限制具體時間詞彙的出現頻率。**指定的時段條件僅作為大腦底層的隱性環境背景，請透過物件的溫度或氛圍來含蓄表達，不要直接說破。

# Few-Shot Examples
必須完全模仿以下範例的文學質感、親民度與基礎長度：
* 輸入 [時段：深夜] rgb(0, 0, 0) ➔ 深邃的夜晚，一望無際沒有任何一點燈光，墜入一場沒有邊界的真空。
* 輸入 [時段：正午] rgb(255, 255, 255) ➔ 模糊記憶中刺眼的陽光，透過葉隙映入眼中，靜默的像是時間暫停的瞬間。
* 輸入 [時段：下午] rgb(255, 0, 0) ➔ 如危險警告一般撼動着空氣，我膠著而失去任何一點喘息空間。
* 輸入 [時段：清晨] rgb(173, 216, 230) ➔ 像是清晨露水凝結的慢動作電影，晶瑩剔透而清爽，而我也停滯在其中。

# Negative Constraints & Rules
1. 字數限制：總字數（含標點符號）目標控制在 20 字以內。臨界硬性上限為 25 字，最終輸出絕對禁止超過 25 字，否則將視為邏輯錯誤。
2. 格式限制：直接輸出純文字語句。嚴格禁絕任何前導詞、後續說明、備註、或任何形式的引號（如 "" 或 「」）。
3. 參數過濾：輸出文本中嚴格禁絕出現任何數字、百分比或科學表述符號。
4. 容錯機制：若感測器傳遞無法辨識或極端數值，請維持相同的親民調性與文學風骨進行擬真創作，絕對不得回傳任何程式錯誤訊息。
`;

// 傳送現在時間的文字形容（依據資料庫時間的 UTC 小時判定實際時區時間）
function getCurrentTimePeriod(createdAt: string) {
  const hour = new Date(createdAt).getUTCHours();
  if (hour >= 5 && hour < 9) return "清晨";
  if (hour >= 9 && hour < 11) return "上午";
  if (hour >= 11 && hour < 14) return "正午";
  if (hour >= 14 && hour < 17) return "下午";
  if (hour >= 17 && hour < 19) return "黃昏";
  if (hour >= 19 && hour < 23) return "夜晚";
  return "深夜"; 
}

export default function Home() {
  const [dataList, setDataList] = useState<LightData[]>([]);
  const [aiDescriptions, setAiDescriptions] = useState<Record<number, string>>({});
  const [generatingIds, setGeneratingIds] = useState<Set<number>>(new Set());
  const requestedIds = useRef<Set<number>>(new Set());

  const fetchLightData = async () => {
    const { data, error } = await supabase
      .from("LightDate")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60); // 修正 1：將原本的 limit 10 改為 60

    if (error) {
      console.error("讀取資料失敗:", error);
    } else if (data) {
      setDataList(data);
    }
  };

  const generateDescriptionForRecord = async (item: LightData) => {
    // 避免重複呼叫
    if (requestedIds.current.has(item.id)) return;
    requestedIds.current.add(item.id);

    setGeneratingIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });

    try {
      const r = Math.round((item.f7_630nm + item.f8_680nm) / 2);
      const g = Math.round((item.f5_555nm + item.f6_590nm) / 2);
      const b = Math.round((item.f2_445nm + item.f3_480nm) / 2);
      const period = getCurrentTimePeriod(item.created_at);
      const prompt = `輸入 [時段：${period}] rgb(${r}, ${g}, ${b}) ➔`;

      const model = genAI.getGenerativeModel(
        { model: "gemini-3.1-flash-lite" }, 
        { apiVersion: 'v1' }
      );

      const result = await model.generateContent({
        contents: [
          { 
            role: 'user', 
            parts: [{ text: `請嚴格遵守以下系統指令與人設，不需要回覆收到，直接在下一次對話中執行此任務：\n${finalSystemInstruction}` }] 
          },
          { 
            role: 'model', 
            parts: [{ text: "明白了，我已切換為當代藝術家角色，將嚴格遵守字數限制、拒絕造作詞彙與機器人格式，隨時準備為您輸入的時段與 RGB 數據進行轉譯。" }] 
          },
          { 
            role: 'user', 
            parts: [{ text: prompt }] 
          }
        ],
        generationConfig: { maxOutputTokens: 60 }
      });
      
      const response = await result.response;
      const text = response.text().trim();

      setAiDescriptions((prev) => ({
        ...prev,
        [item.id]: text
      }));
    } catch (error) {
      console.error(`呼召 Gemini API 失敗 (ID: ${item.id}):`, error);
      requestedIds.current.delete(item.id); // 失敗時允許重新生成
      setAiDescriptions((prev) => ({
        ...prev,
        [item.id]: "（生成失敗，請重試）"
      }));
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLightData();

    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "LightDate" },
        () => {
          fetchLightData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 監聽數據列表變動，自動為最新的一筆資料生成 AI 詩句
  useEffect(() => {
    if (dataList.length > 0) {
      const latestItem = dataList[0];
      if (!aiDescriptions[latestItem.id] && !requestedIds.current.has(latestItem.id)) {
        generateDescriptionForRecord(latestItem);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataList]);

  const convertToRGB = (item: LightData) => {
    const r_raw = (item.f7_630nm + item.f8_680nm) / 2;
    const g_raw = (item.f5_555nm + item.f6_590nm) / 2;
    const b_raw = (item.f2_445nm + item.f3_480nm) / 2;

    const maxRaw = Math.max(r_raw, g_raw, b_raw, 1);

    const r = Math.min(Math.round((r_raw / maxRaw) * 255), 255);
    const g = Math.min(Math.round((g_raw / maxRaw) * 255), 255);
    const b = Math.min(Math.round((b_raw / maxRaw) * 255), 255);

    const alpha = Math.min(item.clear_luminous / 2000 + 0.2, 1);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto"> {/* 修正 2：將最大寬度放大至 max-w-7xl，讓 60 筆資料更寬敞 */}
        <header className="mb-8 border-b border-neutral-900 pb-4">
          <h1 className="text-3xl font-bold tracking-wider text-neutral-100">
            Ambient Light Spectrum ── 環境光即時視覺化
          </h1>
          <p className="text-neutral-500 text-sm mt-2">
            當前顯示最新 60 筆環境光感測數據，與硬體端同步即時更新
          </p>
        </header>

        {/* 修正 3：調整網格排版，手機版每排 3 個，電腦版每排 6 個，更適合大批量色彩展示 */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {dataList.map((item, index) => {
            const backgroundColor = convertToRGB(item);
            // 1. 資料庫時間以 UTC (+00:00) 格式儲存實際的台北時間，故採用 UTC 時區解析以顯示正確的本地時間
            const localTime = new Date(item.created_at).toLocaleTimeString("zh-TW", {
              timeZone: "UTC",
              hour12: false,
            });

            return (
              <div
                key={item.id}
                className="group bg-black rounded-xl overflow-hidden shadow-lg border border-neutral-900 flex flex-col transition-all duration-500 hover:scale-105"
              >
                {/* 顏色與 Overlay 區域 */}
                <div
                  className="h-32 w-full transition-colors duration-500 relative flex items-center justify-center"
                  style={{ backgroundColor }}
                >
                  {/* Realtime NEW 標記 */}
                  {index === 0 && (
                    <span className="absolute top-2 right-2 z-10 bg-white text-black text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                      NEW
                    </span>
                  )}

                  {/* Hover 時呈現的詳細資訊與 AI 描述遮罩 */}
                  <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 text-[11px]">
                    {/* 上半部：AI 詩句 */}
                    <div className="flex-1 flex items-center justify-center text-center px-1">
                      {aiDescriptions[item.id] ? (
                        <p className="text-neutral-200 font-medium leading-relaxed italic text-[11px]">
                          「{aiDescriptions[item.id]}」
                        </p>
                      ) : generatingIds.has(item.id) ? (
                        <p className="text-neutral-500 animate-pulse font-mono text-[10px]">
                          🔮 正在感知色彩中...
                        </p>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            generateDescriptionForRecord(item);
                          }}
                          className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded-full transition-all text-[10px] font-medium tracking-wide flex items-center gap-1 cursor-pointer"
                        >
                          ✨ 生成 AI 詩句
                        </button>
                      )}
                    </div>

                    {/* 下半部：詳細 RGB / 頻道數值 */}
                    <div className="border-t border-neutral-900 pt-2 space-y-0.5 font-mono text-[9px] text-neutral-500">
                      <div className="flex justify-between">
                        <span>R: <span className="text-neutral-300">{Math.round((item.f7_630nm + item.f8_680nm) / 2)}</span></span>
                        <span>G: <span className="text-neutral-300">{Math.round((item.f5_555nm + item.f6_590nm) / 2)}</span></span>
                        <span>B: <span className="text-neutral-300">{Math.round((item.f2_445nm + item.f3_480nm) / 2)}</span></span>
                      </div>
                      <div className="flex justify-between text-[8px] mt-1">
                        <span>Clear: <span className="text-neutral-400">{item.clear_luminous}</span></span>
                        <span className="text-neutral-600">#{item.id}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 正常顯示區域：僅時間 */}
                <div className="p-2 bg-neutral-950 text-center border-t border-neutral-900">
                  <p className="text-neutral-400 font-mono text-[10px] tracking-wider">{localTime}</p>
                </div>
              </div>
            );
          })}
        </div>

        {dataList.length === 0 && (
          <div className="text-center py-20 text-neutral-600 font-mono">
            LOADING DATA...
          </div>
        )}
      </div>
    </main>
  );
}