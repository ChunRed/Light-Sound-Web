"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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

export default function Home() {
  const [dataList, setDataList] = useState<LightData[]>([]);

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

  useEffect(() => {
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
                className="bg-black rounded-xl overflow-hidden shadow-lg border border-neutral-900 flex flex-col transition-all duration-500 hover:scale-105"
              >
                {/* 顏色顯示區域 */}
                <div
                  className="h-28 w-full transition-colors duration-500 relative flex items-center justify-center group" // 微調高度至 h-28 讓畫面更緊湊
                  style={{ backgroundColor }}
                >
                  <span className="bg-black/80 text-neutral-300 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                    {backgroundColor}
                  </span>
                  {index === 0 && (
                    <span className="absolute top-2 right-2 bg-white text-black text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                      NEW
                    </span>
                  )}
                </div>

                {/* 數據資訊區域（維持黑灰白單色） */}
                <div className="p-3 flex-1 flex flex-col justify-between text-[11px] text-neutral-400">
                  <div>
                    <p className="text-neutral-600 font-mono text-[10px] mb-1">{localTime}</p> {/* 僅顯示時間部分，讓排版更乾淨 */}
                    <div className="space-y-0.5 font-mono text-[10px] text-neutral-500">
                      <p><span>R:</span> <span className="text-neutral-400">{Math.round((item.f7_630nm + item.f8_680nm) / 2)}</span></p>
                      <p><span>G:</span> <span className="text-neutral-400">{Math.round((item.f5_555nm + item.f6_590nm) / 2)}</span></p>
                      <p><span>B:</span> <span className="text-neutral-400">{Math.round((item.f2_445nm + item.f3_480nm) / 2)}</span></p>
                      <p><span className="text-neutral-300">Clear: {item.clear_luminous}</span></p>
                    </div>
                  </div>
                  <div className="text-right text-[9px] text-neutral-700 mt-1">
                    #{item.id}
                  </div>
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