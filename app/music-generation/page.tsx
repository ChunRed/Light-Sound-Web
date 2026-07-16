"use client";

// 音樂生成頁：/music-generation
//
// 讀取真實 Supabase 最新一筆光感測資料（與主頁同一資料源與色彩轉換邏輯），
// 算出 sRGB / Wavelength / Text，交給 <SoundGenerator> 即時生成並串流播放音樂。
// 此頁設計為「直接顯示在裝置上讓裝置播放聲音」——開頁 → 點「開始生成聲音」→ 持續播放，
// 感測資料更新時（Supabase realtime）即時重新調音。
//
// 無 Gemini 金鑰時 SoundGenerator 走 mock 合成；設定 NEXT_PUBLIC_GEMINI_API_KEY 後走真實 Lyria。

import { useEffect, useState } from "react";
import { supabase, aiSupabase } from "../../lib/supabase";
import { GuiParams } from "../../components/ColorGui";
import SoundGenerator from "../../components/SoundGenerator";

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

// 與 LatestCalibratedColor 相同的預設校正參數（維持全站顯示色一致）。
const DEFAULT_GUI: GuiParams = {
  redWeight: 0.8,
  greenWeight: 0.9,
  blueWeight: 1.05,
  brightness: 1.35,
  saturation: 0.45,
  contrast: 1.05,
  shadowCrush: 0.0,
  alphaScale: 1.4,
  greenCorrectionThreshold: 150,
  greenCorrectionSlope: 0.55,
};

function applyContrastCurve(x: number, contrast: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const eps = 0.0001;
  const clampedX = Math.max(eps, Math.min(1 - eps, x));
  return 1 / (1 + Math.pow(clampedX / (1 - clampedX), -contrast));
}

// 與 LatestCalibratedColor.convertLightToRGB 一致的色彩轉換。
function convertLightToRGB(item: LightData, g: GuiParams) {
  const sensorAvg =
    (item.f1_415nm +
      item.f2_445nm +
      item.f3_480nm +
      item.f4_515nm +
      item.f5_555nm +
      item.f6_590nm +
      item.f7_630nm +
      item.f8_680nm) /
    8;

  let gCorrection = 1.0;
  if (sensorAvg < g.greenCorrectionThreshold && g.greenCorrectionThreshold > 0) {
    const deficit =
      (g.greenCorrectionThreshold - sensorAvg) / g.greenCorrectionThreshold;
    gCorrection = Math.max(0, 1.0 - g.greenCorrectionSlope * deficit);
  }

  const rRaw = ((item.f7_630nm + item.f8_680nm) / 2) * g.redWeight;
  const gRaw = ((item.f5_555nm + item.f6_590nm) / 2) * g.greenWeight * gCorrection;
  const bRaw = ((item.f2_445nm + item.f3_480nm) / 2) * g.blueWeight;
  const maxRaw = Math.max(rRaw, gRaw, bRaw, 1);

  const intensity = Math.max(0, Math.min(item.clear_luminous / 1000, 1));
  const exponent = 1.0 + g.shadowCrush * 2.0;
  const crushed = Math.pow(intensity, exponent);

  let r = Math.min(Math.round((rRaw / maxRaw) * 255 * g.brightness * crushed), 255);
  let gg = Math.min(Math.round((gRaw / maxRaw) * 255 * g.brightness * crushed), 255);
  let b = Math.min(Math.round((bRaw / maxRaw) * 255 * g.brightness * crushed), 255);

  const lum = 0.299 * r + 0.587 * gg + 0.114 * b;
  r = Math.max(0, Math.min(Math.round(lum + g.saturation * (r - lum)), 255));
  gg = Math.max(0, Math.min(Math.round(lum + g.saturation * (gg - lum)), 255));
  b = Math.max(0, Math.min(Math.round(lum + g.saturation * (b - lum)), 255));

  r = Math.round(applyContrastCurve(r / 255, g.contrast) * 255);
  gg = Math.round(applyContrastCurve(gg / 255, g.contrast) * 255);
  b = Math.round(applyContrastCurve(b / 255, g.contrast) * 255);

  return [r, gg, b];
}

export default function MusicGenerationPage() {
  const [latest, setLatest] = useState<LightData | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);

  const fetchLatest = async () => {
    try {
      const { data, error } = await supabase
        .from("LightDate")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) setLatest(data);
    } catch (e) {
      console.error("[music-generation] fetch latest 失敗:", e);
    }
  };

  const fetchAiText = async (recordId: number) => {
    try {
      const { data, error } = await aiSupabase
        .from("ai_descriptions")
        .select("description")
        .eq("record_id", recordId)
        .maybeSingle();
      setAiText(!error && data?.description ? data.description : null);
    } catch (e) {
      console.error("[music-generation] fetch AI 描述失敗:", e);
    }
  };

  // 最新資料 -> 抓對應的 AI 詩句（含短暫輪詢，等主頁生成完成）。
  useEffect(() => {
    if (!latest) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAiText(latest.id);
    let n = 0;
    const id = setInterval(async () => {
      if (++n > 5) {
        clearInterval(id);
        return;
      }
      const { data } = await aiSupabase
        .from("ai_descriptions")
        .select("description")
        .eq("record_id", latest.id)
        .maybeSingle();
      if (data?.description) {
        setAiText(data.description);
        clearInterval(id);
      }
    }, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest?.id]);

  // 首次抓 + Supabase realtime 訂閱新資料。
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLatest();
    const channel = supabase
      .channel("music-generation-latest")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "LightDate" },
        (payload) => {
          if (payload.new) setLatest(payload.new as LightData);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sRGB = latest ? convertLightToRGB(latest, DEFAULT_GUI) : [0, 0, 0];
  const Wavelength = latest
    ? [
        latest.f1_415nm,
        latest.f2_445nm,
        latest.f3_480nm,
        latest.f4_515nm,
        latest.f5_555nm,
        latest.f6_590nm,
        latest.f7_630nm,
        latest.f8_680nm,
      ]
    : [0, 0, 0, 0, 0, 0, 0, 0];

  return (
    <main
      className="min-h-screen bg-black text-white p-8"
      suppressHydrationWarning
    >
      <div className="max-w-3xl mx-auto">
        <header className="mb-4 border-b border-neutral-900 pb-3">
          <h1 className="text-xl font-bold text-neutral-100">
            Light-Sound-Web · 音樂生成
          </h1>
          <p className="text-neutral-500 text-xs mt-1 font-mono">
            以最新光感測資料（Supabase 即時）驅動聲音生成 · 點「開始生成聲音」播放
            {latest && (
              <span className="ml-2 text-neutral-600">
                #{latest.id} ·{" "}
                {new Date(latest.created_at).toLocaleTimeString("zh-TW", {
                  timeZone: "UTC",
                  hour12: false,
                })}
              </span>
            )}
          </p>
        </header>

        {latest ? (
          <SoundGenerator sRGB={sRGB} Wavelength={Wavelength} Text={aiText} />
        ) : (
          <div className="text-neutral-500 font-mono text-xs py-8">
            讀取最新光感測資料中…（若長時間無資料，請確認 Supabase 環境變數與資料表 LightDate）
          </div>
        )}
      </div>
    </main>
  );
}
