"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { GuiParams } from "./ColorGui";
import DatabaseEmit from "./DatabaseEmit";

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

interface LatestCalibratedColorProps {
  guiParams: GuiParams;
  // 詩句由主頁（app/page.tsx）以記憶體 state 生成後，透過 props 直接下傳；
  // 對應「當前顯示的最新一筆」。不再經由 Supabase ai_descriptions 表。
  aiText: string | null;
}

function applyContrastCurve(x: number, contrast: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const eps = 0.0001;
  const clampedX = Math.max(eps, Math.min(1 - eps, x));
  return 1 / (1 + Math.pow(clampedX / (1 - clampedX), -contrast));
}

function convertLightToRGB(item: LightData, guiParams: GuiParams) {
  const sensor_avg = (
    item.f1_415nm +
    item.f2_445nm +
    item.f3_480nm +
    item.f4_515nm +
    item.f5_555nm +
    item.f6_590nm +
    item.f7_630nm +
    item.f8_680nm
  ) / 8;

  let g_correction = 1.0;
  if (sensor_avg < guiParams.greenCorrectionThreshold && guiParams.greenCorrectionThreshold > 0) {
    const deficit = (guiParams.greenCorrectionThreshold - sensor_avg) / guiParams.greenCorrectionThreshold;
    g_correction = Math.max(0, 1.0 - guiParams.greenCorrectionSlope * deficit);
  }

  const r_raw = ((item.f7_630nm + item.f8_680nm) / 2) * guiParams.redWeight;
  const g_raw = ((item.f5_555nm + item.f6_590nm) / 2) * guiParams.greenWeight * g_correction;
  const b_raw = ((item.f2_445nm + item.f3_480nm) / 2) * guiParams.blueWeight;

  const maxRaw = Math.max(r_raw, g_raw, b_raw, 1);

  const intensity = Math.max(0, Math.min(item.clear_luminous / 1000, 1));
  const exponent = 1.0 + guiParams.shadowCrush * 2.0;
  const crushedIntensity = Math.pow(intensity, exponent);

  let r = Math.min(Math.round((r_raw / maxRaw) * 255 * guiParams.brightness * crushedIntensity), 255);
  let g = Math.min(Math.round((g_raw / maxRaw) * 255 * guiParams.brightness * crushedIntensity), 255);
  let b = Math.min(Math.round((b_raw / maxRaw) * 255 * guiParams.brightness * crushedIntensity), 255);

  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  r = Math.max(0, Math.min(Math.round(luminance + guiParams.saturation * (r - luminance)), 255));
  g = Math.max(0, Math.min(Math.round(luminance + guiParams.saturation * (g - luminance)), 255));
  b = Math.max(0, Math.min(Math.round(luminance + guiParams.saturation * (b - luminance)), 255));

  let r_norm = r / 255;
  let g_norm = g / 255;
  let b_norm = b / 255;

  r_norm = applyContrastCurve(r_norm, guiParams.contrast);
  g_norm = applyContrastCurve(g_norm, guiParams.contrast);
  b_norm = applyContrastCurve(b_norm, guiParams.contrast);

  r = Math.round(r_norm * 255);
  g = Math.round(g_norm * 255);
  b = Math.round(b_norm * 255);

  const baseAlpha = crushedIntensity;
  let alpha = Math.max(0, Math.min(baseAlpha * guiParams.alphaScale, 1));
  alpha = applyContrastCurve(alpha, guiParams.contrast);

  return {
    rgba: `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`,
    r,
    g,
    b,
    alpha
  };
}

export default function LatestCalibratedColor({ guiParams, aiText }: LatestCalibratedColorProps) {
  const [latestData, setLatestData] = useState<LightData | null>(null);

  const fetchLatestRecord = async () => {
    try {
      const { data, error } = await supabase
        .from("LightDate")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setLatestData(data);
      }
    } catch (e) {
      console.error("[LatestCalibratedColor] Fetch exception:", e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLatestRecord();

    const channel = supabase
      .channel("latest-color-simple")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "LightDate" },
        (payload) => {
          if (payload.new) {
            setLatestData(payload.new as LightData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!latestData) {
    return <div className="text-neutral-500 font-mono text-xs py-4">讀取中...</div>;
  }

  const { rgba, r, g, b, alpha } = convertLightToRGB(latestData, guiParams);


  const sRGB = [r, g, b];

  const Wavelength = [
    latestData.f1_415nm,
    latestData.f2_445nm,
    latestData.f3_480nm,
    latestData.f4_515nm,
    latestData.f5_555nm,
    latestData.f6_590nm,
    latestData.f7_630nm,
    latestData.f8_680nm
  ];



  return (
    <div className="mt-8 p-5 bg-neutral-950/40 border border-neutral-900 rounded-xl font-mono text-xs text-neutral-300">
      <div className="flex items-center gap-4 mb-4">
        {/* Simple color box preview */}
        <div
          className="w-12 h-12 rounded border border-neutral-850 shadow-inner"
          style={{ backgroundColor: rgba }}
        />
        <div>
          <div className="font-bold text-neutral-200 text-sm">最新校正色彩與波長數值</div>
          <div className="text-neutral-500 text-[10px] mt-0.5">
            ID: #{latestData.id} | 時間: {new Date(latestData.created_at).toLocaleString("zh-TW")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Calibrated RGB values */}
        <div className="space-y-1 bg-neutral-950/20 p-3 rounded-lg border border-neutral-900/50">
          <div className="text-neutral-400 font-bold mb-2 border-b border-neutral-900 pb-1">
            校正後色彩數值
          </div>
          <div>Red (紅): <span className="text-red-400 font-semibold">{r}</span></div>
          <div>Green (綠): <span className="text-green-400 font-semibold">{g}</span></div>
          <div>Blue (藍): <span className="text-blue-400 font-semibold">{b}</span></div>
          <div>Alpha (不透明度): <span className="text-neutral-400">{alpha.toFixed(2)}</span></div>
        </div>

        {/* Raw wavelength data */}
        <div className="space-y-1 bg-neutral-950/20 p-3 rounded-lg border border-neutral-900/50 flex flex-col justify-between">
          <div>
            <div className="text-neutral-400 font-bold mb-2 border-b border-neutral-900 pb-1">
              原始波長資訊
            </div>
            <div className="grid grid-cols-2 gap-y-1">
              <div>F1 (415nm): <span className="text-neutral-400 font-semibold">{latestData.f1_415nm}</span></div>
              <div>F2 (445nm): <span className="text-neutral-400 font-semibold">{latestData.f2_445nm}</span></div>
              <div>F3 (480nm): <span className="text-neutral-400 font-semibold">{latestData.f3_480nm}</span></div>
              <div>F4 (515nm): <span className="text-neutral-400 font-semibold">{latestData.f4_515nm}</span></div>
              <div>F5 (555nm): <span className="text-neutral-400 font-semibold">{latestData.f5_555nm}</span></div>
              <div>F6 (590nm): <span className="text-neutral-400 font-semibold">{latestData.f6_590nm}</span></div>
              <div>F7 (630nm): <span className="text-neutral-400 font-semibold">{latestData.f7_630nm}</span></div>
              <div>F8 (680nm): <span className="text-neutral-400 font-semibold">{latestData.f8_680nm}</span></div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-900/40 text-[10px] text-neutral-400">
            Wavelength Array: <span className="text-emerald-400">[{Wavelength.join(", ")}]</span>
          </div>
        </div>
      </div>

      <DatabaseEmit sRGB={sRGB} Wavelength={Wavelength} Text={aiText} />
    </div>
  );
}
