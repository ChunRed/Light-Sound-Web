"use client";

import { useState } from "react";
import { surveyQuestions, phase2Questions } from "../../data/surveyQuestions";
import AudioPlayer from "../../components/survey/AudioPlayer";
import ColorOptionPicker from "../../components/survey/ColorOptionPicker";
import SoundOptionPicker from "../../components/survey/SoundOptionPicker";
import SurveyResult, { SurveyAnswer, Phase2Answer } from "../../components/survey/SurveyResult";

function getContrastTheme(hex: string): "light" | "dark" {
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? "dark" : "light";
}

function hexToRgbString(hex: string): string {
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `RGB: ${r}, ${g}, ${b}`;
}

export default function SurveyPage() {
  // step = 0: 介紹頁
  // 1 ~ totalPhase1: 第一階段答題中 (聽音選色)
  // transitionStep: 階段過渡說明頁
  // phase2Start ~ phase2End: 第二階段答題中 (看色選音)
  // resultsStep: 結果頁
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);
  const [phase2Answers, setPhase2Answers] = useState<Phase2Answer[]>([]);

  // 當前題目的暫存狀態
  const [selectedColorId, setSelectedColorId] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [selectedSoundId, setSelectedSoundId] = useState<"A" | "B" | null>(null);

  const totalPhase1 = surveyQuestions.length; // 目前為 5 題
  const totalPhase2 = phase2Questions.length; // 目前為 10 題
  const transitionStep = totalPhase1 + 1; // 6
  const phase2Start = totalPhase1 + 2; // 7
  const phase2End = totalPhase1 + 1 + totalPhase2; // 16
  const resultsStep = phase2End + 1; // 17
  
  // 第一階段當前題目
  const currentQuestion = step > 0 && step <= totalPhase1 ? surveyQuestions[step - 1] : null;

  // 取得背景光暈顏色
  const getSelectedColorHex = () => {
    if (step > 0 && step <= totalPhase1 && currentQuestion) {
      if (!selectedColorId) return "transparent";
      const found = currentQuestion.colorOptions.find((o) => o.id === selectedColorId);
      return found ? found.hex : "transparent";
    } else if (step >= phase2Start && step <= phase2End) {
      const qIdx = step - phase2Start;
      const question = phase2Questions[qIdx];
      return question ? question.targetColorHex : "transparent";
    }
    return "transparent";
  };

  // 開始測驗
  const startSurvey = () => {
    setStep(1);
    setAnswers([]);
    setPhase2Answers([]);
    setSelectedColorId(null);
    setSelectedSoundId(null);
  };

  // 直接開始第二階段
  const startPhase2Directly = () => {
    setStep(phase2Start);
    setAnswers([]);
    setPhase2Answers([]);
    setSelectedColorId(null);
    setSelectedSoundId(null);
  };

  // 前往特定步驟 (包含「上一題」與「下一題」的狀態回復邏輯)
  const navigateToStep = (targetStep: number) => {
    if (targetStep < 0 || targetStep > resultsStep) return;

    if (targetStep > 0 && targetStep <= totalPhase1) {
      // 第一階段
      const prevAnswer = answers.find((a) => a.questionId === targetStep);
      setSelectedColorId(prevAnswer ? prevAnswer.selectedColorId : null);
    } else if (targetStep === transitionStep) {
      // 階段切換過渡頁
    } else if (targetStep >= phase2Start && targetStep <= phase2End) {
      // 第二階段
      const p2QId = targetStep - transitionStep;
      const prevAnswer = phase2Answers.find((a) => a.questionId === p2QId);
      setSelectedSoundId(prevAnswer ? prevAnswer.selectedSoundId : null);
    }

    setStep(targetStep);
  };

  // 點選下一題 / 提交問卷
  const handleNext = () => {
    // 處理第一階段 (聽音選色)
    if (step >= 1 && step <= totalPhase1) {
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
      };

      setAnswers((prev) => {
        const filtered = prev.filter((a) => a.questionId !== currentQuestion.id);
        return [...filtered, newAnswer].sort((a, b) => a.questionId - b.questionId);
      });

      const nextStep = step + 1;
      if (nextStep === transitionStep) {
        setStep(transitionStep);
      } else {
        const nextAnswer = answers.find((a) => a.questionId === nextStep);
        setSelectedColorId(nextAnswer ? nextAnswer.selectedColorId : null);
        setStep(nextStep);
      }
    }
    // 處理第二階段 (看色選音)
    else if (step >= phase2Start && step <= phase2End) {
      const qIdx = step - phase2Start;
      const question = phase2Questions[qIdx];
      if (!question || !selectedSoundId) return;

      const targetColorHex = question.targetColorHex;

      const selectedSoundUrl = selectedSoundId === "A"
        ? question.soundOptions.A
        : question.soundOptions.B;

      const newP2Answer: Phase2Answer = {
        questionId: question.id,
        questionTitle: question.title,
        targetColorHex,
        selectedSoundId,
        selectedSoundUrl,
      };

      setPhase2Answers((prev) => {
        const filtered = prev.filter((a) => a.questionId !== question.id);
        return [...filtered, newP2Answer].sort((a, b) => a.questionId - b.questionId);
      });

      const nextStep = step + 1;
      if (nextStep === resultsStep) {
        setStep(resultsStep);
      } else {
        const nextP2QId = nextStep - transitionStep;
        const nextAnswer = phase2Answers.find((a) => a.questionId === nextP2QId);
        setSelectedSoundId(nextAnswer ? nextAnswer.selectedSoundId : null);
        setStep(nextStep);
      }
    }
  };

  const selectedHex = getSelectedColorHex();

  return (
    <main className="relative min-h-screen bg-[#fafafa] text-zinc-900 flex flex-col items-center justify-between py-6 px-4 overflow-hidden">
      {/* Dynamic Ambient Aura Background */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full blur-[120px] opacity-[0.06] pointer-events-none transition-all duration-1000 ease-out z-0"
        style={{
          background: selectedHex !== "transparent"
            ? `radial-gradient(circle, ${selectedHex} 0%, transparent 70%)`
            : "radial-gradient(circle, #6366f1 0%, transparent 70%)",
        }}
      />

      {/* Main Container */}
      <div className="w-full max-w-md z-10 flex flex-col flex-1 justify-center gap-5">

        {/* Step 0: Introduction screen */}
        {step === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-10 px-5 bg-white border border-zinc-200/80 rounded-xl shadow-sm max-w-md mx-auto my-auto animate-fade-in">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2.5 px-2.5 py-0.5 bg-zinc-100 rounded-full border border-zinc-200/60">
              Glimpses of Light | 截光創作計畫
            </span>
            <h1 className="text-2xl font-bold tracking-tight mb-3 text-zinc-900">
              聲音生成問卷調查
              <span className="block text-sm font-normal text-zinc-400 mt-1">
                Cross-Modal Perception Survey
              </span>
            </h1>
            <p className="text-xs leading-relaxed text-zinc-500 mb-6 px-2">
              歡迎參與雙階段感知問卷調查。
              <br />
              在第一階段中，您將聆聽 5 首聲部並為其挑選契合的色彩卡片。
              <br />
              在第二階段中，您將觀看指定色彩，並選擇最契合的聲音選項。
            </p>
            <div className="flex flex-col w-full gap-3">
              <button
                onClick={startSurvey}
                className="w-full py-3.5 bg-zinc-900 text-white font-semibold rounded-xl active:scale-95 hover:bg-zinc-800 transition-all duration-300 cursor-pointer text-xs font-semibold"
              >
                開始第一階段 (聽音選色)
              </button>
              <button
                onClick={startPhase2Directly}
                className="w-full py-3 px-4 border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer text-xs bg-white font-semibold"
              >
                直接進行第二階段 (看色選音)
              </button>
            </div>
          </div>
        )}

        {/* Step 1~5: Survey Phase 1 questioning screen */}
        {step > 0 && step <= totalPhase1 && currentQuestion && (
          <div className="flex flex-col gap-5 animate-fade-in">
            {/* Top Navigation & Progress bar */}
            <div className="flex flex-col gap-2.5 px-0.5">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">
                    Phase 1 | 第一階段：聽音選色
                  </span>
                  <h2 className="text-base font-bold text-zinc-800 mt-0.5 font-mono">
                    {currentQuestion.title}
                  </h2>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 font-mono">
                  {step} / {totalPhase1}
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full h-1 bg-zinc-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 transition-all duration-500 ease-out"
                  style={{ width: `${(step / totalPhase1) * 100}%` }}
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

            {/* Navigation buttons */}
            <div className="flex justify-between items-center border-t border-zinc-200/60 pt-4 mt-1">
              <button
                onClick={() => navigateToStep(step - 1)}
                className="flex items-center gap-1.5 py-2.5 px-3 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer text-xs bg-white font-semibold"
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
                上一頁
              </button>

              <button
                onClick={handleNext}
                disabled={!selectedColorId}
                className={`flex items-center gap-1.5 py-2.5 px-4 font-semibold rounded-lg transition-all text-xs ${selectedColorId
                  ? "bg-zinc-900 text-white active:scale-95 hover:bg-zinc-800 cursor-pointer shadow-sm"
                  : "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200/60"
                  }`}
              >
                下一頁
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
        )}

        {/* Step 6: Transition Screen */}
        {step === transitionStep && (
          <div className="flex flex-col items-center justify-center text-center py-10 px-5 bg-white border border-zinc-200/80 rounded-xl shadow-sm max-w-md mx-auto my-auto animate-fade-in">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2.5 px-2.5 py-0.5 bg-zinc-100 rounded-full border border-zinc-200/60">
              Phase 1 Completed / 階段一已完成
            </span>
            <h1 className="text-xl font-bold tracking-tight mb-3 text-zinc-900">
              第一階段：聽音選色已完成
            </h1>
            <p className="text-xs leading-relaxed text-zinc-500 mb-6 px-2">
              您已順利完成第一階段。
              <br />
              接下來進入 **第二階段：看色選音**。
              您將看到一個指定的色彩，請聆聽下方兩個聲音選項，選擇最契合該色彩的音訊。
            </p>
            <div className="flex w-full gap-3">
              <button
                onClick={() => navigateToStep(totalPhase1)}
                className="py-3 px-4 border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer text-xs bg-white font-semibold"
              >
                返回第一階段
              </button>
              <button
                onClick={() => navigateToStep(phase2Start)}
                className="flex-1 py-3.5 bg-zinc-900 text-white font-semibold rounded-xl active:scale-95 hover:bg-zinc-800 transition-all duration-300 cursor-pointer text-xs font-semibold"
              >
                開始第二階段
              </button>
            </div>
          </div>
        )}

        {/* Step 7~16: Survey Phase 2 questioning screen */}
        {step >= phase2Start && step <= phase2End && (
          <div className="flex flex-col gap-5 animate-fade-in">
            {/* Top Navigation & Progress bar */}
            <div className="flex flex-col gap-2.5 px-0.5">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">
                    Phase 2 | 第二階段：看色選音
                  </span>
                  <h2 className="text-base font-bold text-zinc-800 mt-0.5 font-mono">
                    題目 {String(step - transitionStep).padStart(2, "0")}
                  </h2>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 font-mono">
                  {step - transitionStep} / {totalPhase2}
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full h-1 bg-zinc-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 transition-all duration-500 ease-out"
                  style={{ width: `${((step - transitionStep) / totalPhase2) * 100}%` }}
                />
              </div>
            </div>

            {/* Target Color Swatch Display with High Legibility */}
            {(() => {
              const qIdx = step - phase2Start;
              const question = phase2Questions[qIdx];
              if (!question) return null;
              const targetColorHex = question.targetColorHex;
              const theme = getContrastTheme(targetColorHex);
              const textPrimary = theme === "dark" ? "text-zinc-900" : "text-white";
              const tagBg = theme === "dark" ? "bg-black/10 text-zinc-800" : "bg-white/20 text-white/95";

              return (
                <div
                  className="w-full h-40 rounded-2xl border border-zinc-200/40 shadow-inner flex flex-col items-center justify-center gap-1.5 transition-all duration-1000"
                  style={{ backgroundColor: targetColorHex }}
                >
                  <span className={`text-[10px] font-mono font-bold tracking-widest uppercase px-3 py-1 rounded-full ${tagBg}`}>
                    目標色彩
                  </span>
                  <span className={`text-xs font-mono font-bold ${textPrimary}`}>
                    {targetColorHex}
                  </span>
                  <span className={`text-[10px] font-mono opacity-80 ${textPrimary}`}>
                    {hexToRgbString(targetColorHex)}
                  </span>
                </div>
              );
            })()}

            {/* SoundOptionPicker */}
            {(() => {
              const qIdx = step - phase2Start;
              const question = phase2Questions[qIdx];
              if (!question) return null;

              return (
                <SoundOptionPicker
                  soundAUrl={question.soundOptions.A}
                  soundBUrl={question.soundOptions.B}
                  selectedId={selectedSoundId}
                  onChange={setSelectedSoundId}
                />
              );
            })()}

            {/* Navigation buttons */}
            <div className="flex justify-between items-center border-t border-zinc-200/60 pt-4 mt-1">
              <button
                onClick={() => navigateToStep(step - 1)}
                className="flex items-center gap-1.5 py-2.5 px-3 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer text-xs bg-white font-semibold"
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
                上一頁
              </button>

              <button
                onClick={handleNext}
                disabled={!selectedSoundId}
                className={`flex items-center gap-1.5 py-2.5 px-4 font-semibold rounded-lg transition-all text-xs ${selectedSoundId
                  ? "bg-zinc-900 text-white active:scale-95 hover:bg-zinc-800 cursor-pointer shadow-sm"
                  : "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200/60"
                  }`}
              >
                {step === phase2End ? "完成並提交" : "下一頁"}
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
        )}

        {/* Step 17: Result page */}
        {step === resultsStep && (
          <SurveyResult
            answers={answers}
            phase2Answers={phase2Answers}
            onRestart={startSurvey}
          />
        )}

      </div>

      {/* Footer footer info */}
      <footer className="w-full max-w-md text-center text-[9px] text-zinc-400 mt-10 border-t border-zinc-200/60 pt-3 z-10 flex flex-row justify-between">
        <span>© 2026 No Side Here X TK-Wang</span>
        <span>Glimpse of Light: Negotiating Creative Control
          Between Environment, Mapping, and Generative
          Music Models</span>
      </footer>
    </main>
  );
}
