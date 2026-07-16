// lib/lyriaMapping.ts
//
// 純函式：把「光感測資料」映射為 Lyria RealTime 的生成參數與加權提示詞。
// 完全與 SDK / React 解耦，可獨立測試。設計沿用 neurips2026/lyria_bridge.py
// 的映射哲學，但改以本網頁實際擁有的三種資料為輸入：
//
//   sRGB       顏色資料 [r, g, b]         (0..255)
//   Wavelength 波長能量 [f1..f8]          (AS7341 8 通道原始 counts)
//   Text       AI 生成的中文微型詩句       (作為情緒 / 意境 prompt)
//
// 參數映射（sensor -> Lyria）:
//   整體亮度 (luminance)      -> brightness (音色亮度)
//   波長頻譜的「起伏 / 對比」    -> density    (音符密度 / 節奏繁複度)
//   頻譜熵 (spectral entropy)  -> guidance   (熵高 -> guidance 低 -> 更發散)
//   紅/暖 vs 藍/冷 主導         -> bpm        (暖色偏慢、冷色偏快，落在 chill 區間)
//   F1-F8 冷簇 / 暖簇能量比     -> 兩條加權 prompt (冷 ethereal / 暖 lo-fi)
//   Text (詩句)               -> 一條情緒 prompt (權重固定，含蓄引導音色)

export interface LyriaMusicParams {
  brightness: number; // 0..1
  density: number; // 0..1
  guidance: number; // 建議域 1..6
  bpm: number; // 60..140 (整數)
  temperature: number; // 0.8..1.4
}

export interface WeightedPromptSpec {
  text: string;
  weight: number; // 0..1（實際下發前會正規化）
}

export interface LyriaMappingResult {
  params: LyriaMusicParams;
  prompts: WeightedPromptSpec[];
  // 供 UI 顯示的中繼值
  debug: {
    luminance: number;
    coldEnergy: number;
    warmEnergy: number;
    entropy: number;
  };
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const clamp = (x: number, lo: number, hi: number): number =>
  x < lo ? lo : x > hi ? hi : x;

// Lyria guidance 建議域約 1..6（中性偏高 = 更貼合提示）。
export const GUIDANCE_MIN = 1.0;
export const GUIDANCE_MAX = 6.0;

// F1-F8 分冷簇（短波藍紫綠 ~415-515nm）與暖簇（長波黃橙紅 ~555-680nm）。
const COLD_INDICES = [0, 1, 2, 3]; // F1 415 / F2 445 / F3 480 / F4 515
const WARM_INDICES = [4, 5, 6, 7]; // F5 555 / F6 590 / F7 630 / F8 680

// 由 8 通道波長能量計算「頻譜熵」，正規化到 0..1（熵高 = 能量分佈越均勻）。
function spectralEntropy(wavelength: number[]): number {
  const bands = wavelength.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const total = bands.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let h = 0;
  for (const v of bands) {
    if (v <= 0) continue;
    const p = v / total;
    h -= p * Math.log(p);
  }
  // 8 通道均勻分佈時 H_max = ln(8)
  const hMax = Math.log(bands.length || 1);
  return hMax > 0 ? clamp01(h / hMax) : 0;
}

// 由波長頻譜相鄰通道的變化量估「起伏 / 對比」，映射為 density。
function spectralRoughness(wavelength: number[]): number {
  const bands = wavelength.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const max = Math.max(1, ...bands);
  let diff = 0;
  for (let i = 1; i < bands.length; i++) {
    diff += Math.abs(bands[i] - bands[i - 1]);
  }
  // 正規化：相鄰差總和 / (最大值 * 通道數)
  return clamp01(diff / (max * bands.length));
}

/**
 * 主映射：三種資料 -> Lyria 生成參數 + 加權提示詞。
 */
export function mapDataToLyria(
  sRGB: number[],
  wavelength: number[],
  text: string | null
): LyriaMappingResult {
  const r = clamp(sRGB?.[0] ?? 0, 0, 255);
  const g = clamp(sRGB?.[1] ?? 0, 0, 255);
  const b = clamp(sRGB?.[2] ?? 0, 0, 255);

  // 感知亮度（Rec.601 luma）正規化到 0..1。
  const luminance = clamp01((0.299 * r + 0.587 * g + 0.114 * b) / 255);

  // brightness：直接取感知亮度（越亮 -> 音色越明亮）。給一點下限避免全靜。
  const brightness = clamp(luminance, 0.05, 1.0);

  // density：波長頻譜的起伏（頻譜越崎嶇 -> 音符越密）。
  const wl = Array.isArray(wavelength) ? wavelength : [];
  const density = clamp(spectralRoughness(wl), 0.05, 1.0);

  // guidance：與頻譜熵反比（熵高 -> 更發散 -> guidance 低）。
  const entropy = spectralEntropy(wl);
  const guidance = GUIDANCE_MIN + (1.0 - entropy) * (GUIDANCE_MAX - GUIDANCE_MIN);

  // 冷 / 暖能量比。
  const coldEnergy = COLD_INDICES.reduce(
    (a, i) => a + Math.max(0, wl[i] ?? 0),
    0
  );
  const warmEnergy = WARM_INDICES.reduce(
    (a, i) => a + Math.max(0, wl[i] ?? 0),
    0
  );
  const totalEnergy = coldEnergy + warmEnergy;
  let coldW = 0.5;
  let warmW = 0.5;
  if (totalEnergy > 0) {
    coldW = coldEnergy / totalEnergy;
    warmW = warmEnergy / totalEnergy;
  }
  // 若波長全 0，退回用 RGB 冷暖傾向估計。
  if (totalEnergy <= 0) {
    const warmish = (r + g * 0.5) / (r + g + b + 1);
    warmW = clamp01(warmish);
    coldW = clamp01(1 - warmish);
  }
  // 保底避免任一權重為 0（Lyria 會過濾零權重）。
  coldW = Math.max(0.1, coldW);
  warmW = Math.max(0.1, warmW);

  // bpm：暖色偏慢、冷色偏快，落在放鬆的 chill 區間 72..108。
  const bpm = Math.round(108 - warmW * 36);

  // temperature：亮度越高越活潑，範圍 0.9..1.3。
  const temperature = clamp(0.9 + brightness * 0.4, 0.8, 1.4);

  const prompts: WeightedPromptSpec[] = [
    { text: "cool ethereal ambient synth pads, airy and spacious", weight: round4(coldW) },
    { text: "warm analog lo-fi soulful groove, cozy and mellow", weight: round4(warmW) },
  ];

  // Text（AI 詩句）作為含蓄的情緒 prompt。詩句本身是中文意象，Lyria 對氛圍詞
  // 敏感，故以固定中等權重併入，讓音色貼合當下光影的心理投射。
  const mood = (text ?? "").trim();
  if (mood.length > 0) {
    prompts.push({
      text: `${mood}, cinematic emotional atmosphere`,
      weight: 0.55,
    });
  }

  return {
    params: {
      brightness: round6(brightness),
      density: round6(density),
      guidance: round4(guidance),
      bpm,
      temperature: round4(temperature),
    },
    prompts,
    debug: {
      luminance: round4(luminance),
      coldEnergy: Math.round(coldEnergy),
      warmEnergy: Math.round(warmEnergy),
      entropy: round4(entropy),
    },
  };
}

function round4(x: number): number {
  return Math.round(x * 1e4) / 1e4;
}
function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}
