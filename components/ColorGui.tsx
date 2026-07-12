"use client";

import React, { useState } from "react";

export interface GuiParams {
  redWeight: number;
  greenWeight: number;
  blueWeight: number;
  brightness: number;
  saturation: number;
  contrast: number;
  shadowCrush: number;
  alphaScale: number;
  greenCorrectionThreshold: number;
  greenCorrectionSlope: number;
}

interface ColorGuiProps {
  params: GuiParams;
  onChange: (params: GuiParams) => void;
}

const defaultParams: GuiParams = {
  redWeight: 0.80,
  greenWeight: 0.90,
  blueWeight: 1.05,
  brightness: 1.35,
  saturation: 0.45,
  contrast: 1.05,
  shadowCrush: 0.00,
  alphaScale: 1.40,
  greenCorrectionThreshold: 150,
  greenCorrectionSlope: 0.55,
};

export default function ColorGui({ params, onChange }: ColorGuiProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleSliderChange = (key: keyof GuiParams, value: number) => {
    onChange({
      ...params,
      [key]: value,
    });
  };

  const handleReset = () => {
    onChange(defaultParams);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 p-3 bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
        aria-label="Toggle Color Control Panel"
      >
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 animate-pulse"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
            />
          </svg>
        )}
      </button>

      {/* Control Panel */}
      <div
        className={`w-80 backdrop-blur-xl bg-neutral-950/90 border border-neutral-800/80 rounded-2xl p-5 shadow-2xl transition-all duration-500 origin-bottom-right ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-90 translate-y-4 pointer-events-none absolute"
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-800/60 pb-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100 tracking-wider">SPECTRUM TENSION</h2>
            <p className="text-[10px] text-neutral-400">即時調色盤參數面板</p>
          </div>
          <button
            onClick={handleReset}
            className="text-[10px] bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white px-2.5 py-1 rounded-md border border-neutral-800 transition-colors cursor-pointer"
          >
            重設
          </button>
        </div>

        <div className="space-y-4">
          {/* R Channel Weight */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-red-400 font-medium">紅色權重 (Red)</span>
              <span className="text-neutral-400">{params.redWeight.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={params.redWeight}
              onChange={(e) => handleSliderChange("redWeight", parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>

          {/* G Channel Weight */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-emerald-400 font-medium">綠色權重 (Green)</span>
              <span className="text-neutral-400">{params.greenWeight.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={params.greenWeight}
              onChange={(e) => handleSliderChange("greenWeight", parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* B Channel Weight */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-blue-400 font-medium">藍色權重 (Blue)</span>
              <span className="text-neutral-400">{params.blueWeight.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={params.blueWeight}
              onChange={(e) => handleSliderChange("blueWeight", parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="border-t border-neutral-800/40 my-3"></div>

          {/* Saturation */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-purple-400 font-medium">色彩飽和度 (Saturation)</span>
              <span className="text-neutral-400">{params.saturation.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={params.saturation}
              onChange={(e) => handleSliderChange("saturation", parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Brightness */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-amber-400 font-medium">整體明度 (Brightness)</span>
              <span className="text-neutral-400">{params.brightness.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={params.brightness}
              onChange={(e) => handleSliderChange("brightness", parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Contrast */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-orange-400 font-medium">整體對比度 (Contrast)</span>
              <span className="text-neutral-400">{params.contrast.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.05"
              value={params.contrast}
              onChange={(e) => handleSliderChange("contrast", parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>

          {/* Shadow Crush */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-rose-400 font-medium">暗部壓低 (Shadow Crush)</span>
              <span className="text-neutral-400">{params.shadowCrush.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={params.shadowCrush}
              onChange={(e) => handleSliderChange("shadowCrush", parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <p className="text-[9px] text-neutral-500">數值越高，低亮度數值會變得更深暗 (範圍 0-1)</p>
          </div>

          {/* Alpha Scale */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-cyan-400 font-medium">不透明度擴展 (Alpha)</span>
              <span className="text-neutral-400">{params.alphaScale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={params.alphaScale}
              onChange={(e) => handleSliderChange("alphaScale", parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <div className="border-t border-neutral-800/40 my-3"></div>

          {/* Green Correction Threshold */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-lime-400 font-medium">綠色校正閥值 (Threshold)</span>
              <span className="text-neutral-400">{params.greenCorrectionThreshold.toFixed(0)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="3000"
              step="50"
              value={params.greenCorrectionThreshold}
              onChange={(e) => handleSliderChange("greenCorrectionThreshold", parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-lime-500"
            />
            <p className="text-[9px] text-neutral-500">低於此平均數值時啟動綠色抑制</p>
          </div>

          {/* Green Correction Slope */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-lime-400 font-medium">綠色抑制斜率 (Slope)</span>
              <span className="text-neutral-400">{params.greenCorrectionSlope.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={params.greenCorrectionSlope}
              onChange={(e) => handleSliderChange("greenCorrectionSlope", parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-lime-500"
            />
            <p className="text-[9px] text-neutral-500">數值越低，綠色衰減比率越高</p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-800/60 text-[9px] text-neutral-500 text-center font-mono uppercase tracking-widest">
          Spectrum Visualizer Tool
        </div>
      </div>
    </div>
  );
}
