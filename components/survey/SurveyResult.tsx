"use client";

import { surveyQuestions } from "../../data/surveyQuestions";

export interface SurveyAnswer {
  questionId: number;
  questionTitle: string;
  selectedColorId: "A" | "B" | "C" | "D";
  selectedColorHex: string;
  selectedColorLabel: string;
  ratings: {
    brightness: number;
    saturation: number;
    temperature: number;
  };
}

interface SurveyResultProps {
  answers: SurveyAnswer[];
  onRestart: () => void;
}

export default function SurveyResult({ answers, onRestart }: SurveyResultProps) {
  // 處理下載 JSON 數據
  const handleDownloadJSON = () => {
    const surveyData = {
      timestamp: new Date().toISOString(),
      answers,
    };

    // 輸出至控制台
    console.log("[Survey Result Data]:", surveyData);

    // 建立 JSON 下載
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

  // 渲染評分點 (1-5) - 極簡黑點
  const renderScaleDots = (value: number) => {
    return (
      <div className="flex gap-1 mt-1">
        {[1, 2, 3, 4, 5].map((dot) => (
          <span
            key={dot}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              dot <= value ? "bg-zinc-800" : "bg-zinc-200"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in max-w-xl mx-auto">
      {/* Dashboard Header - Minimalist */}
      <div className="border border-zinc-200/80 rounded-2xl p-5 bg-zinc-50 shadow-sm">
        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
          問卷調查已完成
        </h2>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
          感謝您參與此感官聯覺問卷。下方為您在 10 道聲音評測中，所對應的色彩卡片與三要素屬性數據。
        </p>

        {/* Buttons inside header for mobile efficiency */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={handleDownloadJSON}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white font-semibold rounded-xl active:scale-95 transition-all cursor-pointer text-xs"
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
            下載 JSON 數據
          </button>

          <button
            onClick={onRestart}
            className="py-3 px-4 border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer text-xs bg-white"
          >
            重新測試
          </button>
        </div>
      </div>

      {/* Results List - 1 column for clean mobile viewing */}
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
                <span className="font-semibold text-zinc-700">
                  {(idx + 1).toString().padStart(2, "0")} — {q.title}
                </span>
              </div>

              {/* Data Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Selected Color Block */}
                  <div
                    className="w-8 h-8 rounded-lg border border-zinc-200/60"
                    style={{ backgroundColor: ans.selectedColorHex }}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-zinc-800">
                      {ans.selectedColorLabel}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {ans.selectedColorHex.toUpperCase()}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded font-mono">
                  選項 {ans.selectedColorId}
                </span>
              </div>

              {/* Attributes Details */}
              <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3 text-[10px]">
                <div className="flex flex-col">
                  <span className="text-zinc-400">明亮度 ({ans.ratings.brightness})</span>
                  {renderScaleDots(ans.ratings.brightness)}
                </div>

                <div className="flex flex-col">
                  <span className="text-zinc-400">飽和度 ({ans.ratings.saturation})</span>
                  {renderScaleDots(ans.ratings.saturation)}
                </div>

                <div className="flex flex-col">
                  <span className="text-zinc-400">色溫 ({ans.ratings.temperature})</span>
                  {renderScaleDots(ans.ratings.temperature)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

