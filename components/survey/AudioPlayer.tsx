"use client";

import { useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  audioUrl: string;
}

export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 當 audioUrl 改變時，重置播放狀態並載入新音訊
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      audioRef.current.load();
    }
  }, [audioUrl]);

  // 切換播放/暫停狀態
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn("Autoplay / Audio play blocked or failed:", err);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newPercentage = Math.min(Math.max(clickX / width, 0), 1);
    const newTime = newPercentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full bg-zinc-50 border border-zinc-200/60 rounded-xl p-3.5 sm:p-4 flex flex-col gap-3">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        preload="metadata"
      />

      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
          Sound Stimulus / 聲音刺激
        </span>
        <span className="text-[10px] text-zinc-400 font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-3.5">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer shrink-0"
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? (
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 fill-current ml-0.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Progress Bar */}
        <div
          onClick={handleProgressClick}
          className="flex-1 h-1.5 bg-zinc-200/60 rounded-full cursor-pointer relative overflow-hidden"
        >
          <div
            className="absolute top-0 left-0 h-full bg-zinc-900 rounded-full transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

