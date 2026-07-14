"use client";

import { useEffect } from "react";

interface DatabaseEmitProps {
  sRGB: number[];
  Wavelength: number[];
}


export default function DatabaseEmit({ sRGB, Wavelength }: DatabaseEmitProps) {
  useEffect(() => {


    console.log("[DatabaseEmit] 成功捕捉到資料:", { sRGB, Wavelength });

  }, [sRGB, Wavelength]);

  return null;

}
