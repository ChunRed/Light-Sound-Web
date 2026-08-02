"use client";

interface AttributeSlidersProps {
  values: {
    brightness: number;
    saturation: number;
    temperature: number;
  };
  onChange: (key: "brightness" | "saturation" | "temperature", value: number) => void;
}

export default function AttributeSliders({ values, onChange }: AttributeSlidersProps) {
  const sliderConfig = [
    {
      key: "brightness" as const,
      label: "明亮度 (Brightness)",
      leftLabel: "昏暗/沉重",
      rightLabel: "明亮/輕盈",
    },
    {
      key: "saturation" as const,
      label: "飽和度 (Saturation)",
      leftLabel: "灰暗/淡雅",
      rightLabel: "鮮豔/濃烈",
    },
    {
      key: "temperature" as const,
      label: "色溫 (Temperature)",
      leftLabel: "冷色調",
      rightLabel: "暖色調",
    },
  ];

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="px-1">
        <span className="text-[11px] uppercase tracking-widest text-zinc-400 font-semibold">
          Color Attributes / 色彩屬性
        </span>
      </div>

      <div className="flex flex-col gap-5 bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4 sm:p-5">
        {sliderConfig.map((cfg) => {
          const val = values[cfg.key];

          return (
            <div key={cfg.key} className="flex flex-col gap-2">
              {/* Slider Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-800">
                  {cfg.label}
                </span>
                <span className="text-xs font-bold text-zinc-500 font-mono">
                  {val} / 5
                </span>
              </div>

              {/* Slider Input Row */}
              <div className="flex flex-col gap-1">
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={val}
                  onChange={(e) => onChange(cfg.key, parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-200 rounded-full appearance-none cursor-pointer focus:outline-none"
                />

                {/* Range Labels */}
                <div className="flex justify-between text-[10px] text-zinc-400 px-0.5">
                  <span>{cfg.leftLabel}</span>
                  <span className="text-zinc-300">中性</span>
                  <span>{cfg.rightLabel}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom styles for range slider thumb */}
      <style jsx global>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.15);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(0.9);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.15);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
      `}</style>
    </div>
  );
}

