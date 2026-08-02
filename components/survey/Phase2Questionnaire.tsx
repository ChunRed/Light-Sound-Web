"use client";

import { useState } from "react";

export interface Phase2Survey {
  visualFactors: string[];
  otherVisualFactor: string;
  decisionFactors: string[];
  otherDecisionFactor: string;
  feedback: string;
}

interface Phase2QuestionnaireProps {
  value: Phase2Survey;
  onChange: (val: Phase2Survey) => void;
  onBack: () => void;
  onNext: () => void;
}

const VISUAL_OPTIONS = [
  "色相（Color Tone）（如：紅、藍、黃等冷暖色調差異）",
  "明度（Brightness）（如：明亮、深暗）",
  "飽和度（Saturation）（如：鮮豔、灰暗/低飽和）",
  "視覺產生的溫度或質地感（如：炎熱/冰冷、平滑/粗糙）",
];

const DECISION_OPTIONS = [
  "比對聲音的強弱與張力是否符合視覺衝擊力",
  "比對聲音的頻率高低是否符合色彩的明暗",
  "依靠聲音帶來的情緒氛圍是否與色彩一致",
  "單純憑第一時間的直覺，無法明確說明理由",
];

export default function Phase2Questionnaire({
  value,
  onChange,
  onBack,
  onNext,
}: Phase2QuestionnaireProps) {
  const [isOtherVisualChecked, setIsOtherVisualChecked] = useState(
    value.otherVisualFactor !== "" || value.visualFactors.includes("其他")
  );
  const [isOtherDecisionChecked, setIsOtherDecisionChecked] = useState(
    value.otherDecisionFactor !== "" || value.decisionFactors.includes("其他")
  );

  const handleVisualChange = (option: string, checked: boolean) => {
    let newFactors = [...value.visualFactors];
    if (checked) {
      if (!newFactors.includes(option)) {
        newFactors.push(option);
      }
    } else {
      newFactors = newFactors.filter((f) => f !== option);
    }
    onChange({ ...value, visualFactors: newFactors });
  };

  const handleOtherVisualCheckboxChange = (checked: boolean) => {
    setIsOtherVisualChecked(checked);
    let newFactors = [...value.visualFactors];
    if (checked) {
      if (!newFactors.includes("其他")) {
        newFactors.push("其他");
      }
    } else {
      newFactors = newFactors.filter((f) => f !== "其他");
      onChange({ ...value, visualFactors: newFactors, otherVisualFactor: "" });
      return;
    }
    onChange({ ...value, visualFactors: newFactors });
  };

  const handleDecisionChange = (option: string, checked: boolean) => {
    let newFactors = [...value.decisionFactors];
    if (checked) {
      if (!newFactors.includes(option)) {
        newFactors.push(option);
      }
    } else {
      newFactors = newFactors.filter((f) => f !== option);
    }
    onChange({ ...value, decisionFactors: newFactors });
  };

  const handleOtherDecisionCheckboxChange = (checked: boolean) => {
    setIsOtherDecisionChecked(checked);
    let newFactors = [...value.decisionFactors];
    if (checked) {
      if (!newFactors.includes("其他")) {
        newFactors.push("其他");
      }
    } else {
      newFactors = newFactors.filter((f) => f !== "其他");
      onChange({ ...value, decisionFactors: newFactors, otherDecisionFactor: "" });
      return;
    }
    onChange({ ...value, decisionFactors: newFactors });
  };

  return (
    <div className="flex flex-col gap-6 p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-sm animate-fade-in">
      {/* Title */}
      <div>
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 px-2.5 py-0.5 bg-zinc-100 rounded-full border border-zinc-200/60 inline-block">
          Perception Survey / 階段二感知反饋
        </span>
        <h2 className="text-base font-bold text-zinc-900 mt-1">
          第二階段：看色選音
        </h2>
      </div>

      {/* Question 3 (Checkboxes) */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-bold text-zinc-800 leading-relaxed">
          3. 看色選音依據：當你觀看指定色彩並在兩種聲音選項中做選擇時，色彩的哪些視覺特性最影響你的判斷？（可複選）
        </label>
        <div className="flex flex-col gap-2">
          {VISUAL_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200/60 hover:bg-zinc-50 cursor-pointer transition-all"
            >
              <input
                type="checkbox"
                className="mt-0.5 accent-zinc-900 rounded cursor-pointer"
                checked={value.visualFactors.includes(option)}
                onChange={(e) => handleVisualChange(option, e.target.checked)}
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
                checked={isOtherVisualChecked}
                onChange={(e) => handleOtherVisualCheckboxChange(e.target.checked)}
              />
              <span className="text-xs text-zinc-700 leading-normal">其他</span>
            </label>
            {isOtherVisualChecked && (
              <input
                type="text"
                placeholder="請輸入其他依據..."
                className="w-full mt-1 p-2.5 border border-zinc-200 rounded-lg text-xs outline-none focus:border-zinc-900 transition-all bg-white"
                value={value.otherVisualFactor}
                onChange={(e) => onChange({ ...value, otherVisualFactor: e.target.value })}
              />
            )}
          </div>
        </div>
      </div>

      {/* Question 4 (Checkboxes) */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-bold text-zinc-800 leading-relaxed">
          4. 聲音二選一的決策因素：面對「一色對兩音」的二選一情境，你通常如何判斷哪一個聲音「更契合」？（可複選）
        </label>
        <div className="flex flex-col gap-2">
          {DECISION_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200/60 hover:bg-zinc-50 cursor-pointer transition-all"
            >
              <input
                type="checkbox"
                className="mt-0.5 accent-zinc-900 rounded cursor-pointer"
                checked={value.decisionFactors.includes(option)}
                onChange={(e) => handleDecisionChange(option, e.target.checked)}
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
                checked={isOtherDecisionChecked}
                onChange={(e) => handleOtherDecisionCheckboxChange(e.target.checked)}
              />
              <span className="text-xs text-zinc-700 leading-normal">其他</span>
            </label>
            {isOtherDecisionChecked && (
              <input
                type="text"
                placeholder="請輸入其他因素..."
                className="w-full mt-1 p-2.5 border border-zinc-200 rounded-lg text-xs outline-none focus:border-zinc-900 transition-all bg-white"
                value={value.otherDecisionFactor}
                onChange={(e) => onChange({ ...value, otherDecisionFactor: e.target.value })}
              />
            )}
          </div>
        </div>
      </div>

      {/* Question 5 (Essay) */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-bold text-zinc-800 leading-relaxed">
          5. 有任何想要回饋的想法都歡迎留下。
        </label>
        <textarea
          placeholder="歡迎留下任何您的想法、回饋或感受..."
          rows={4}
          className="w-full p-3 border border-zinc-200 rounded-xl text-xs outline-none focus:border-zinc-900 transition-all bg-white resize-none"
          value={value.feedback}
          onChange={(e) => onChange({ ...value, feedback: e.target.value })}
        />
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
          className="flex-1 py-3.5 bg-zinc-900 text-white font-semibold rounded-xl active:scale-95 hover:bg-zinc-800 transition-all duration-300 cursor-pointer text-xs font-semibold"
        >
          完成並提交
        </button>
      </div>
    </div>
  );
}
