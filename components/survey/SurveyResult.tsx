"use client";

import { useState } from "react";
import { surveyQuestions, phase2Questions } from "../../data/surveyQuestions";
import { Phase1Survey } from "./Phase1Questionnaire";
import { Phase2Survey } from "./Phase2Questionnaire";

function hexToRgbString(hex: string): string {
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `RGB: ${r}, ${g}, ${b}`;
}

export interface SurveyAnswer {
  questionId: number;
  questionTitle: string;
  selectedColorId: "A" | "B" | "C" | "D";
  selectedColorHex: string;
  selectedColorLabel: string;
}

export interface Phase2Answer {
  questionId: number;
  questionTitle: string;
  targetColorHex: string;
  selectedSoundId: "A" | "B";
  selectedSoundUrl: string;
}

interface SurveyResultProps {
  answers: SurveyAnswer[];
  phase2Answers: Phase2Answer[];
  phase1Survey: Phase1Survey;
  phase2Survey: Phase2Survey;
  onRestart: () => void;
}

export default function SurveyResult({
  answers,
  phase2Answers,
  phase1Survey,
  phase2Survey,
  onRestart,
}: SurveyResultProps) {
  const [activeTab, setActiveTab] = useState<"phase1" | "phase2">("phase1");

  // 處理下載 JSON 數據
  const handleDownloadJSON = () => {
    const surveyData = {
      timestamp: new Date().toISOString(),
      phase1Answers: answers,
      phase1Survey: phase1Survey,
      phase2Answers: phase2Answers,
      phase2Survey: phase2Survey,
    };

    console.log("[Survey Result Data]:", surveyData);

    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(surveyData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `survey_results_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    alert("JSON 數據已成功下載！請開啟瀏覽器控制台 (F12 / Console) 查看完整 Log。");
  };

  return (
    <div className="w-full flex flex-col gap-5 animate-fade-in max-w-xl mx-auto">
      {/* Dashboard Header */}
      <div className="border border-zinc-200/80 rounded-2xl p-5 bg-zinc-50 shadow-sm">
        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
          問卷調查已完成
        </h2>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
          感謝您參與此聯覺感官問卷！我們已彙整您在兩個階段測試中的所有感知數據。
        </p>

        {/* Buttons inside header for mobile efficiency */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={handleDownloadJSON}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white font-semibold rounded-xl active:scale-95 transition-all cursor-pointer text-xs font-semibold"
          >
            <svg
              className="w-3.5 h-3.5 fill-current"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            下載兩階段 JSON 數據
          </button>

          <button
            onClick={onRestart}
            className="py-3 px-4 border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer text-xs bg-white font-semibold"
          >
            重新測試
          </button>
        </div>
      </div>

      {/* Segmented Tab Controls */}
      <div className="flex bg-zinc-100 p-1 rounded-xl w-full border border-zinc-200/50">
        <button
          onClick={() => setActiveTab("phase1")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "phase1"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          階段一：聽音選色
        </button>
        <button
          onClick={() => setActiveTab("phase2")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "phase2"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          階段二：看色選音
        </button>
      </div>

      {/* Results List */}
      {activeTab === "phase1" ? (
        answers.length === 0 ? (
          <div className="text-center py-10 px-5 text-zinc-400 text-xs bg-white border border-zinc-200/60 rounded-2xl shadow-sm">
            您跳過了此階段測驗
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {surveyQuestions.map((q, idx) => {
              const ans = answers.find((a) => a.questionId === q.id);
              if (!ans) return null;

              return (
                <div
                  key={q.id}
                  className="bg-white border border-zinc-200/60 rounded-xl p-4 flex flex-col gap-3.5 shadow-sm"
                >
                  {/* Question Header */}
                  <div className="flex justify-between items-center text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-700 font-mono">
                      {(idx + 1).toString().padStart(2, "0")} — {q.title}
                    </span>
                  </div>

                  {/* Data Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg border border-zinc-200/60 shadow-inner"
                        style={{ backgroundColor: ans.selectedColorHex }}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-800">
                          選項 {ans.selectedColorId}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {ans.selectedColorHex.toUpperCase()} • {hexToRgbString(ans.selectedColorHex)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Phase 1 Survey Feedback display */}
            {phase1Survey && (phase1Survey.features.length > 0 || phase1Survey.intuition) && (
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 flex flex-col gap-3 shadow-sm mt-2">
                <h3 className="text-xs font-bold text-zinc-800 border-b border-zinc-200/60 pb-2">
                  第一階段感知反饋
                </h3>
                {phase1Survey.features.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase">依據的聲音特徵：</span>
                    <ul className="list-disc pl-4 text-xs text-zinc-600 flex flex-col gap-0.5">
                      {phase1Survey.features.map((f) => (
                        <li key={f}>
                          {f === "其他" && phase1Survey.otherFeature ? `其他：${phase1Survey.otherFeature}` : f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {phase1Survey.intuition && (
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase">直覺連結程度：</span>
                    <span className="text-xs text-zinc-750">{phase1Survey.intuition}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      ) : (
        phase2Answers.length === 0 ? (
          <div className="text-center py-10 px-5 text-zinc-400 text-xs bg-white border border-zinc-200/60 rounded-2xl shadow-sm">
            您跳過了此階段測驗
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {phase2Questions.map((q, idx) => {
              const ans = phase2Answers.find((a) => a.questionId === q.id);
              if (!ans) return null;

              // 取得純粹的檔名
              const fileName = ans.selectedSoundUrl.substring(
                ans.selectedSoundUrl.lastIndexOf("/") + 1
              );

              return (
                <div
                  key={q.id}
                  className="bg-white border border-zinc-200/60 rounded-xl p-4 flex flex-col gap-3.5 shadow-sm"
                >
                  {/* Question Header */}
                  <div className="flex justify-between items-center text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-700 font-mono">
                      {(idx + 1).toString().padStart(2, "0")} — {q.title}
                    </span>
                  </div>

                  {/* Data Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg border border-zinc-200/60 shadow-inner"
                        style={{ backgroundColor: ans.targetColorHex }}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-800">
                          選項 {ans.selectedSoundId} ({fileName})
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          目標色彩：{ans.targetColorHex.toUpperCase()} • {hexToRgbString(ans.targetColorHex)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Phase 2 Survey Feedback display */}
            {phase2Survey && (phase2Survey.visualFactors.length > 0 || phase2Survey.decisionFactors.length > 0 || phase2Survey.feedback) && (
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 flex flex-col gap-3 shadow-sm mt-2">
                <h3 className="text-xs font-bold text-zinc-800 border-b border-zinc-200/60 pb-2">
                  第二階段感知反饋
                </h3>
                {phase2Survey.visualFactors.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase">影響判斷的色彩視覺特性：</span>
                    <ul className="list-disc pl-4 text-xs text-zinc-600 flex flex-col gap-0.5">
                      {phase2Survey.visualFactors.map((v) => (
                        <li key={v}>
                          {v === "其他" && phase2Survey.otherVisualFactor ? `其他：${phase2Survey.otherVisualFactor}` : v}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {phase2Survey.decisionFactors.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase">聲音二選一決策因素：</span>
                    <ul className="list-disc pl-4 text-xs text-zinc-600 flex flex-col gap-0.5">
                      {phase2Survey.decisionFactors.map((d) => (
                        <li key={d}>
                          {d === "其他" && phase2Survey.otherDecisionFactor ? `其他：${phase2Survey.otherDecisionFactor}` : d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {phase2Survey.feedback && (
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase">意見回饋：</span>
                    <p className="text-xs text-zinc-700 bg-white p-2.5 rounded-lg border border-zinc-200/60 leading-relaxed whitespace-pre-wrap">
                      {phase2Survey.feedback}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
