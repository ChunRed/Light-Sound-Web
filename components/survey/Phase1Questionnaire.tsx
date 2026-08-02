"use client";

import { useState } from "react";

export interface Phase1Survey {
  features: string[];
  otherFeature: string;
  intuition: string;
}

interface Phase1QuestionnaireProps {
  value: Phase1Survey;
  onChange: (val: Phase1Survey) => void;
  onBack: () => void;
  onNext: () => void;
}

const FEATURE_OPTIONS = [
  "音色/質感（如：清亮、粗糙、圓潤、金屬感）",
  "音高/頻率（如：高音、低音）",
  "節奏/速度（如：快節奏、慢節奏、律動感）",
  "動態/音量（如：聲音強弱、漸強漸弱）",
  "空間感/聲場（如：殘響、開闊感、距離感）",
  "個人情感/情境聯想（如：平靜、焦慮、冷暖、自然/城市畫面）",
];

const INTUITION_OPTIONS = [
  "非常直覺，幾乎立刻能連結到特定色彩",
  "需要反覆聆聽，透過細節比較來挑選",
  "較難連結，主要憑直覺隨機選取",
];

export default function Phase1Questionnaire({
  value,
  onChange,
  onBack,
  onNext,
}: Phase1QuestionnaireProps) {
  const [isOtherChecked, setIsOtherChecked] = useState(
    value.otherFeature !== "" || value.features.includes("其他")
  );

  const handleFeatureChange = (option: string, checked: boolean) => {
    let newFeatures = [...value.features];
    if (checked) {
      if (!newFeatures.includes(option)) {
        newFeatures.push(option);
      }
    } else {
      newFeatures = newFeatures.filter((f) => f !== option);
    }
    onChange({ ...value, features: newFeatures });
  };

  const handleOtherCheckboxChange = (checked: boolean) => {
    setIsOtherChecked(checked);
    let newFeatures = [...value.features];
    if (checked) {
      if (!newFeatures.includes("其他")) {
        newFeatures.push("其他");
      }
    } else {
      newFeatures = newFeatures.filter((f) => f !== "其他");
      onChange({ ...value, features: newFeatures, otherFeature: "" });
      return;
    }
    onChange({ ...value, features: newFeatures });
  };

  const handleOtherTextChange = (text: string) => {
    onChange({ ...value, otherFeature: text });
  };

  const handleIntuitionChange = (option: string) => {
    onChange({ ...value, intuition: option });
  };

  const isFormValid = value.intuition !== "";

  return (
    <div className="flex flex-col gap-6 p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-sm animate-fade-in">
      {/* Title */}
      <div>
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 px-2.5 py-0.5 bg-zinc-100 rounded-full border border-zinc-200/60 inline-block">
          Perception Survey / 階段一感知反饋
        </span>
        <h2 className="text-base font-bold text-zinc-900 mt-1">
          第一階段：聽音選色
        </h2>
      </div>

      {/* Question 1 (Checkboxes) */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-bold text-zinc-800 leading-relaxed">
          1. 聲音特徵依據：在第一階段「聽音選色」中，你主要是依據聲音的哪些特徵來選擇對應色彩？（可複選）
        </label>
        <div className="flex flex-col gap-2">
          {FEATURE_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200/60 hover:bg-zinc-50 cursor-pointer transition-all"
            >
              <input
                type="checkbox"
                className="mt-0.5 accent-zinc-900 rounded cursor-pointer"
                checked={value.features.includes(option)}
                onChange={(e) => handleFeatureChange(option, e.target.checked)}
              />
              <span className="text-xs text-zinc-700 leading-normal">{option}</span>
            </label>
          ))}

          {/* Other option wrapper */}
          <div className="flex flex-col gap-2 p-3 rounded-xl border border-zinc-200/60 hover:bg-zinc-50 transition-all">
            <label className="flex items-start gap-3 cursor-pointer w-full">
              <input
                type="checkbox"
                className="mt-0.5 accent-zinc-900 rounded cursor-pointer"
                checked={isOtherChecked}
                onChange={(e) => handleOtherCheckboxChange(e.target.checked)}
              />
              <span className="text-xs text-zinc-700 leading-normal">其他</span>
            </label>
            {isOtherChecked && (
              <input
                type="text"
                placeholder="請輸入其他依據..."
                className="w-full mt-1 p-2.5 border border-zinc-200 rounded-lg text-xs outline-none focus:border-zinc-900 transition-all bg-white"
                value={value.otherFeature}
                onChange={(e) => handleOtherTextChange(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Question 2 (Radios) */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-bold text-zinc-800 leading-relaxed">
          2. 直覺程度：聆聽這 5 首聲部時，你是否能快速在腦海中形成明確的色彩對應？ <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-col gap-2">
          {INTUITION_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200/60 hover:bg-zinc-50 cursor-pointer transition-all"
            >
              <input
                type="radio"
                name="intuition"
                className="mt-0.5 accent-zinc-900 cursor-pointer"
                checked={value.intuition === option}
                onChange={() => handleIntuitionChange(option)}
              />
              <span className="text-xs text-zinc-700 leading-normal">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 border-t border-zinc-200/60 pt-4 mt-1">
        <button
          onClick={onBack}
          className="py-3 px-4 border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer text-xs bg-white font-semibold"
        >
          返回上一頁
        </button>
        <button
          onClick={onNext}
          disabled={!isFormValid}
          className={`flex-1 py-3.5 font-semibold rounded-xl transition-all text-xs text-center ${
            isFormValid
              ? "bg-zinc-900 text-white active:scale-95 hover:bg-zinc-800 cursor-pointer shadow-sm"
              : "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200/60"
          }`}
        >
          進入第二階段
        </button>
      </div>
    </div>
  );
}
