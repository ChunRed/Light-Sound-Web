"use client";

import { useEffect } from "react";
import SoundGenerator from "./SoundGenerator";

interface DatabaseEmitProps {
  sRGB: number[];
  Wavelength: number[];
  Text: string | null;
}

export default function DatabaseEmit({ sRGB, Wavelength, Text }: DatabaseEmitProps) {

  useEffect(() => {
    console.log("[DatabaseEmit] 成功捕捉到資料:", { sRGB, Wavelength, Text });
  }, [sRGB, Wavelength, Text]);



  useEffect(() => {
    const timer = setInterval(() => {
      console.log("[DatabaseEmit] 每秒同步數據:", { sRGB, Wavelength, Text });
    }, 10000);

    return () => {
      clearInterval(timer);
    };
  }, [sRGB, Wavelength, Text]);



  // 以此三種資料即時生成並串流播放 Lyria 音樂（此網頁會顯示在裝置上讓其直接播放）。
  return <SoundGenerator sRGB={sRGB} Wavelength={Wavelength} Text={Text} />;
}
