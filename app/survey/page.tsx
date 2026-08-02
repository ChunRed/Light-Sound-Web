"use client";

import { useState } from "react";
import { surveyQuestions } from "../../data/surveyQuestions";
import AudioPlayer from "../../components/survey/AudioPlayer";
import ColorOptionPicker from "../../components/survey/ColorOptionPicker";
import AttributeSliders from "../../components/survey/AttributeSliders";
import SurveyResult, { SurveyAnswer } from "../../components/survey/SurveyResult";

export default function SurveyPage() {
  // step = 0: 介紹頁, 1~10: 答題中, 11: 結果頁
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);

  // 當前題目的暫存狀態
  const [selectedColorId, setSelectedColorId] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [ratings, setRatings] = useState({
    brightness: 3,
    saturation: 3,
    temperature: 3,
  });

  const totalQuestions = surveyQuestions.length;
  const currentQuestion = step > 0 && step <= totalQuestions ? surveyQuestions[step - 1] : null;

  // 取得當前所選取色彩的 Hex，供背景背景光暈使用
  const getSelectedColorHex = () => {
    if (!currentQuestion || !selectedColorId) return "transparent";
    const found = currentQuestion.colorOptions.find((o) => o.id === selectedColorId);
    return found ? found.hex : "transparent";
  };

  // 開始測驗
  const startSurvey = () => {
    setStep(1);
    setAnswers([]);
    setSelectedColorId(null);
    setRatings({ brightness: 3, saturation: 3, temperature: 3 });
  };

  // 前往特定步驟 (包含「上一題」與「下一題」的狀態回復邏輯)
  const navigateToStep = (targetStep: number) => {
    if (targetStep < 0 || targetStep > totalQuestions + 1) return;

    // 如果是「往回走」，需要恢復之前的答題狀態
    if (targetStep > 0 && targetStep <= totalQuestions) {
      const prevAnswer = answers.find((a) => a.questionId === targetStep);
      if (prevAnswer) {
        setSelectedColorId(prevAnswer.selectedColorId);
        setRatings({ ...prevAnswer.ratings });
      } else {
        setSelectedColorId(null);
        setRatings({ brightness: 3, saturation: 3, temperature: 3 });
      }
    }

    setStep(targetStep);
  };

  // 點選下一題 / 提交問卷
  const handleNext = () => {
    if (!currentQuestion || !selectedColorId) return;

    const currentOption = currentQuestion.colorOptions.find(
      (o) => o.id === selectedColorId
    )!;

    const newAnswer: SurveyAnswer = {
      questionId: currentQuestion.id,
      questionTitle: currentQuestion.title,
      selectedColorId,
      selectedColorHex: currentOption.hex,
      selectedColorLabel: currentOption.label,
      ratings: { ...ratings },
    };

    // 更新或新增回答記錄
    setAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionId !== currentQuestion.id);
      return [...filtered, newAnswer].sort((a, b) => a.questionId - b.questionId);
    });

    if (step === totalQuestions) {
      // 完成最後一題，進入結果頁
      setStep(totalQuestions + 1);
    } else {
      // 進入下一題，並先確認下一題是否已有舊答案
      const nextStep = step + 1;
      const nextAnswer = answers.find((a) => a.questionId === nextStep);
      if (nextAnswer) {
        setSelectedColorId(nextAnswer.selectedColorId);
        setRatings({ ...nextAnswer.ratings });
      } else {
        setSelectedColorId(null);
        setRatings({ brightness: 3, saturation: 3, temperature: 3 });
      }
      setStep(nextStep);
    }
  };

  // 處理評分滑桿變更
  const handleRatingChange = (
    key: "brightness" | "saturation" | "temperature",
    value: number
  ) => {
    setRatings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const selectedHex = getSelectedColorHex();

  return (
    <main className="relative min-h-screen bg-[#fafafa] text-zinc-900 flex flex-col items-center justify-between py-6 px-4 overflow-hidden">
      {/* Dynamic Ambient Aura Background - Very subtle color reflection on white bg */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full blur-[120px] opacity-[0.06] pointer-events-none transition-all duration-1000 ease-out z-0"
        style={{
          background: selectedHex !== "transparent"
            ? `radial-gradient(circle, ${selectedHex} 0%, transparent 70%)`
            : "radial-gradient(circle, #6366f1 0%, transparent 70%)",
        }}
      />

      {/* Main Container - max-w-md for neat mobile reading */}
      <div className="w-full max-w-md z-10 flex flex-col flex-1 justify-center gap-5">
        
        {/* Step 0: Introduction screen */}
        {step === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-10 px-5 bg-white border border-zinc-200/80 rounded-xl shadow-sm max-w-md mx-auto my-auto animate-fade-in">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2.5 px-2.5 py-0.5 bg-zinc-100 rounded-full border border-zinc-200/60">
              Experiment / 聯覺實驗
            </span>
            <h1 className="text-2xl font-bold tracking-tight mb-3 text-zinc-900">
              聯覺感官問卷調查
              <span className="block text-sm font-normal text-zinc-400 mt-1">
                Cross-Modal Perception Survey
              </span>
            </h1>
            <p className="text-xs leading-relaxed text-zinc-500 mb-6 px-2">
              歡迎來到色彩與音訊的跨媒介映射實驗。
              在接下來的 10 個步驟中，您將會聆聽 10 首不同的聲音，並根據直覺為每首聲音挑選最契合的色彩以及調整其感知屬性。
            </p>
            <button
              onClick={startSurvey}
              className="w-full py-3.5 bg-zinc-900 text-white font-semibold rounded-xl active:scale-95 hover:bg-zinc-800 transition-all duration-300 cursor-pointer text-xs"
            >
              開始進行測驗
            </button>
          </div>
        )}

        {/* Step 1~10: Survey questioning screen */}
        {step > 0 && step <= totalQuestions && currentQuestion && (
          <div className="flex flex-col gap-5 animate-fade-in">
            
            {/* Top Navigation & Progress bar */}
            <div className="flex flex-col gap-2.5 px-0.5">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-base font-bold text-zinc-800">
                    {currentQuestion.title}
                  </h1>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 font-mono">
                  {step} / {totalQuestions}
                </span>
              </div>
              
              {/* Visual Progress Bar */}
              <div className="w-full h-1 bg-zinc-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 transition-all duration-500 ease-out"
                  style={{ width: `${(step / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            {/* Audio Player component */}
            <AudioPlayer audioUrl={currentQuestion.audioUrl} />

            {/* Color Option Picker component */}
            <ColorOptionPicker
              options={currentQuestion.colorOptions}
              selectedId={selectedColorId}
              onChange={setSelectedColorId}
            />

            {/* Attribute sliders component */}
            <AttributeSliders
              values={ratings}
              onChange={handleRatingChange}
            />

            {/* Navigation buttons */}
            <div className="flex justify-between items-center border-t border-zinc-200/60 pt-4 mt-1">
              <button
                onClick={() => navigateToStep(step - 1)}
                className="flex items-center gap-1.5 py-2.5 px-3 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer text-xs bg-white"
              >
                <svg
                  className="w-3.5 h-3.5 fill-current rotate-180"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                上一題
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleNext}
                  disabled={!selectedColorId}
                  className={`flex items-center gap-1.5 py-2.5 px-4 font-semibold rounded-lg transition-all text-xs ${
                    selectedColorId
                      ? "bg-zinc-900 text-white active:scale-95 hover:bg-zinc-800 cursor-pointer shadow-sm"
                      : "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200/60"
                  }`}
                >
                  {step === totalQuestions ? "完成並提交" : "下一題"}
                  <svg
                    className="w-3.5 h-3.5 fill-current"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Step 11: Result page */}
        {step === totalQuestions + 1 && (
          <SurveyResult
            answers={answers}
            onRestart={startSurvey}
          />
        )}

      </div>

      {/* Footer footer info */}
      <footer className="w-full max-w-md text-center text-[9px] text-zinc-400 mt-10 border-t border-zinc-200/60 pt-3 z-10 flex flex-row justify-between">
        <span>© 2026 Taiwan Lantern Festival</span>
        <span>設計：聯覺實驗研究小組</span>
      </footer>
    </main>
  );
}

