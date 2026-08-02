"use client";

import { useState, useEffect, useRef } from "react";

interface SoundOptionPickerProps {
  soundAUrl: string;
  soundBUrl: string;
  selectedId: "A" | "B" | null;
  onChange: (id: "A" | "B") => void;
}

export default function SoundOptionPicker({
  soundAUrl,
  soundBUrl,
  selectedId,
  onChange,
}: SoundOptionPickerProps) {
  const [playingId, setPlayingId] = useState<"A" | "B" | null>(null);
  const [progressA, setProgressA] = useState(0);
  const [progressB, setProgressB] = useState(0);

  const audioRefA = useRef<HTMLAudioElement | null>(null);
  const audioRefB = useRef<HTMLAudioElement | null>(null);

  // 當音訊 URL 改變（換題）時，停止播放並重置進度
  useEffect(() => {
    stopAll();
    setProgressA(0);
    setProgressB(0);
  }, [soundAUrl, soundBUrl]);

  // 卸載時清理音訊
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const stopAll = () => {
    if (audioRefA.current) {
      audioRefA.current.pause();
      audioRefA.current.currentTime = 0;
    }
    if (audioRefB.current) {
      audioRefB.current.pause();
      audioRefB.current.currentTime = 0;
    }
    setPlayingId(null);
  };

  const handlePlayToggle = (e: React.MouseEvent, id: "A" | "B") => {
    e.stopPropagation(); // 防止觸發卡片選取

    const targetAudio = id === "A" ? audioRefA.current : audioRefB.current;
    const otherAudio = id === "A" ? audioRefB.current : audioRefA.current;

    if (!targetAudio) return;

    if (playingId === id) {
      targetAudio.pause();
      setPlayingId(null);
    } else {
      if (otherAudio) {
        otherAudio.pause();
        otherAudio.currentTime = 0;
        if (id === "A") setProgressB(0);
        else setProgressA(0);
      }
      targetAudio.play().catch((err) => {
        console.warn("Audio playback failed:", err);
      });
      setPlayingId(id);
    }
  };

  const handleTimeUpdate = (id: "A" | "B") => {
    const audio = id === "A" ? audioRefA.current : audioRefB.current;
    if (!audio || !audio.duration) return;
    const progress = (audio.currentTime / audio.duration) * 100;
    if (id === "A") setProgressA(progress);
    else setProgressB(progress);
  };

  const handleEnded = (id: "A" | "B") => {
    setPlayingId(null);
    if (id === "A") setProgressA(0);
    else setProgressB(0);
  };

  const renderOptionRow = (id: "A" | "B", url: string, progress: number) => {
    const isSelected = selectedId === id;
    const isPlaying = playingId === id;

    return (
      <div
        onClick={() => onChange(id)}
        className={`relative flex items-center justify-between p-5 rounded-2xl border cursor-pointer transition-all duration-200 active:scale-[0.98] group overflow-hidden bg-white ${
          isSelected
            ? "border-zinc-900 ring-2 ring-zinc-900/5 shadow-sm"
            : "border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50/50"
        }`}
      >
        {/* Play/Pause & Info Block */}
        <div className="flex items-center gap-4 z-10">
          <button
            onClick={(e) => handlePlayToggle(e, id)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isPlaying
                ? "bg-zinc-900 text-white hover:bg-zinc-800"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {isPlaying ? (
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-zinc-800">
              聲音選項 {id}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
              {isPlaying ? "播放中..." : "點擊播放預覽"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected ? "border-zinc-900" : "border-zinc-300"
            }`}
          >
            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-zinc-900" />}
          </div>
        </div>

        {/* Dynamic Background Progress Bar */}
        <div
          className="absolute left-0 bottom-0 h-1 bg-zinc-900/10 transition-all duration-100 ease-out pointer-events-none"
          style={{ width: `${progress}%` }}
        />

        <audio
          ref={id === "A" ? audioRefA : audioRefB}
          src={url}
          onTimeUpdate={() => handleTimeUpdate(id)}
          onEnded={() => handleEnded(id)}
          preload="none"
        />
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-3.5">
      <div className="flex justify-between items-center px-1">
        <span className="text-[11px] uppercase tracking-widest text-zinc-400 font-semibold">
          Sound Options / 聲音選取
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {renderOptionRow("A", soundAUrl, progressA)}
        {renderOptionRow("B", soundBUrl, progressB)}
      </div>
    </div>
  );
}
