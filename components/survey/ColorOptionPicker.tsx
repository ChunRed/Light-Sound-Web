"use client";

import { ColorOption } from "../../data/surveyQuestions";

interface ColorOptionPickerProps {
  options: [ColorOption, ColorOption, ColorOption, ColorOption];
  selectedId: 'A' | 'B' | 'C' | 'D' | null;
  onChange: (id: 'A' | 'B' | 'C' | 'D') => void;
}

// 計算背景色的相對明亮度以決定字體顏色 (W3C 演算法)
function getContrastTheme(hex: string): "light" | "dark" {
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // 明亮度公式
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 閾值設為 140，大於 140 屬淺色背景（需深色字體），小於等於 140 屬深色背景（需白色字體）
  return brightness > 140 ? "dark" : "light";
}

export default function ColorOptionPicker({
  options,
  selectedId,
  onChange,
}: ColorOptionPickerProps) {
  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex justify-between items-center px-1">
        <span className="text-[11px] uppercase tracking-widest text-zinc-400 font-semibold">
          Color Selection / 色彩選擇
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {options.map((option) => {
          const isSelected = selectedId === option.id;
          const theme = getContrastTheme(option.hex);
          
          // 根據背景主題選擇對應的文字顏色 class
          const textPrimary = theme === "dark" ? "text-zinc-900" : "text-white";
          const textSecondary = theme === "dark" ? "text-zinc-600" : "text-white/60";
          const tagBg = theme === "dark" ? "bg-black/10 text-zinc-700" : "bg-white/20 text-white/90";
          const borderStyle = isSelected
            ? theme === "dark" ? "border-zinc-900 ring-2 ring-zinc-900/10 scale-[1.02]" : "border-white ring-2 ring-white/10 scale-[1.02]"
            : "border-black/5";

          return (
            <button
              key={option.id}
              onClick={() => onChange(option.id)}
              className={`relative flex flex-col p-4 rounded-xl border text-center cursor-pointer transition-all duration-200 active:scale-95 group overflow-hidden ${borderStyle}`}
              style={{ backgroundColor: option.hex }}
            >
              {/* Text Information - Centered */}
              <div className="w-full flex flex-col gap-1 px-0.5 justify-center items-center">
                <div className="flex justify-center items-center gap-1.5">
                  <span className={`text-[9px] font-mono font-bold px-1 rounded shrink-0 ${tagBg}`}>
                    {option.id}
                  </span>
                  <span className={`font-semibold text-xs shrink-0 ${textPrimary}`}>
                    {option.label}
                  </span>
                </div>
                <span className={`text-[10px] font-mono ${textSecondary}`}>
                  {option.hex.toUpperCase()}
                </span>
              </div>

              {/* Selected Highlight Overlay Dot/Line */}
              {isSelected && (
                <div className={`absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full ${
                  theme === "dark" ? "bg-zinc-900" : "bg-white"
                }`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

