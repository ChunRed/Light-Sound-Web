"use client";

import { ColorOption } from "../../data/surveyQuestions";

interface ColorOptionPickerProps {
  options: ColorOption[];
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

// 將 HEX 轉為 RGB 字串
function hexToRgbString(hex: string): string {
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `RGB: ${r}, ${g}, ${b}`;
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

      <div className="grid grid-cols-2 gap-4">
        {options.map((option) => {
          const isSelected = selectedId === option.id;
          const theme = getContrastTheme(option.hex);
          
          // 根據背景主題選擇對應的文字顏色 class
          const textSecondary = theme === "dark" ? "text-zinc-600" : "text-white/70";
          const tagBg = theme === "dark" ? "bg-black/10 text-zinc-800" : "bg-white/20 text-white/95";
          const borderStyle = isSelected
            ? theme === "dark" ? "border-zinc-900 ring-4 ring-zinc-900/10 scale-[1.01]" : "border-white ring-4 ring-white/10 scale-[1.01]"
            : "border-zinc-200/40 hover:border-zinc-300/60 shadow-sm";

          return (
            <button
              key={option.id}
              onClick={() => onChange(option.id)}
              className={`relative flex flex-col justify-between items-center h-52 py-6 px-4 rounded-2xl border cursor-pointer transition-all duration-200 active:scale-[0.97] group overflow-hidden ${borderStyle}`}
              style={{ backgroundColor: option.hex }}
            >
              {/* Top Section - Option Identifier */}
              <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded shrink-0 transition-all ${tagBg}`}>
                選項 {option.id}
              </span>

              {/* Bottom Section - Hex & RGB Codes */}
              <div className="flex flex-col items-center gap-0.5 z-10 text-center">
                <span className={`text-[10px] font-mono tracking-wider transition-all ${textSecondary}`}>
                  {option.hex.toUpperCase()}
                </span>
                <span className={`text-[9px] font-mono tracking-wider transition-all ${textSecondary}`}>
                  {hexToRgbString(option.hex)}
                </span>
              </div>

              {/* Selected Highlight Overlay - Solid Bottom Bar */}
              {isSelected && (
                <div className={`absolute bottom-0 left-0 right-0 h-2.5 transition-all ${
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

