export interface ColorOption {
  id: 'A' | 'B' | 'C' | 'D';
  hex: string;
  label: string;
}

export interface SurveyQuestion {
  id: number;
  audioUrl: string;
  title: string;
  colorOptions: ColorOption[];
  targetColorId?: 'A' | 'B' | 'C' | 'D';
}

export interface Phase2Question {
  id: number;
  title: string;
  targetColorHex: string;
  soundOptions: {
    A: string;
    B: string;
  };
  targetSoundId: 'A' | 'B';
}

// 實作計算 HEX 補色 (採用 HSL 色相旋轉 180 度，保留相同明度與飽和度) 的輔助函式
function getComplementaryColor(hex: string): string {
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h /= 6;
  }

  // 旋轉色相 180 度 (即在 0..1 範圍中 + 0.5) 得到對比色相
  h = (h + 0.5) % 1.0;

  const hue2rgb = (p: number, q: number, t: number) => {
    let val = t;
    if (val < 0) val += 1;
    if (val > 1) val -= 1;
    if (val < 1 / 6) return p + (q - p) * 6 * val;
    if (val < 1 / 2) return q;
    if (val < 2 / 3) return p + (q - p) * (2 / 3 - val) * 6;
    return p;
  };

  let rComp, gComp, bComp;
  if (s === 0) {
    rComp = gComp = bComp = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    rComp = hue2rgb(p, q, h + 1 / 3);
    gComp = hue2rgb(p, q, h);
    bComp = hue2rgb(p, q, h - 1 / 3);
  }

  const pad = (num: number) => {
    const val = Math.round(num * 255);
    return val.toString(16).padStart(2, "0");
  };
  return `#${pad(rComp)}${pad(gComp)}${pad(bComp)}`.toUpperCase();
}

// 完整的 10 題原始資料
const rawQuestions = [
  { id: 1, hex: '#FBFBD5', label: '淡米黃', audio: '/sounds/Q01_llm_full.wav' },
  { id: 2, hex: '#E2F3BA', label: '嫩綠', audio: '/sounds/Q02_llm_full.wav' },
  { id: 3, hex: '#5C563D', label: '深橄欖棕', audio: '/sounds/Q03_llm_full.wav' },
  { id: 4, hex: '#A2A9A4', label: '鼠尾草灰', audio: '/sounds/Q04_llm_full.wav' },
  { id: 5, hex: '#C6997E', label: '陶土粉', audio: '/sounds/Q05_llm_full.wav' },
  { id: 6, hex: '#968CBD', label: '薰衣草紫', audio: '/sounds/Q06_llm_full.wav' },
  { id: 7, hex: '#CEBADA', label: '丁香紫', audio: '/sounds/Q07_llm_full.wav' },
  { id: 8, hex: '#EDBDBD', label: '霧粉', audio: '/sounds/Q08_llm_full.wav' },
  { id: 9, hex: '#584F48', label: '深岩灰', audio: '/sounds/Q09_llm_full.wav' },
  { id: 10, hex: '#E4DB90', label: '鵝黃', audio: '/sounds/Q10_llm_full.wav' }
];

// 階段一正確答案為 A A B A B (前 5 題)
const phase1TargetColorIds: ('A' | 'B')[] = ['A', 'A', 'B', 'A', 'B'];

// 1. 產生階段一題目 (surveyQuestions)
export const surveyQuestions: SurveyQuestion[] = rawQuestions.slice(0, 5).map((q, idx) => {
  const targetId = phase1TargetColorIds[idx];
  const isTargetA = targetId === 'A';
  const compHex = getComplementaryColor(q.hex);

  return {
    id: q.id,
    audioUrl: q.audio,
    title: `題目 0${q.id}`,
    colorOptions: [
      {
        id: 'A',
        hex: isTargetA ? q.hex : compHex,
        label: isTargetA ? q.label : '補色'
      },
      {
        id: 'B',
        hex: isTargetA ? compHex : q.hex,
        label: isTargetA ? '補色' : q.label
      }
    ],
    targetColorId: targetId
  };
});

// 2. 產生階段二題目 (phase2Questions)
// 題目配置對照：
// 題目 1: 聲音 (Q06_full, Q06_nopoem)，正確答案為 Q06_full ➔ 目標色彩為 Q06 ➔ 聲音 B 是正確答案 (targetSoundId: 'B')
// 題目 2: 聲音 (Q07_nopoem, Q07_full)，正確答案為 Q07_nopoem ➔ 目標色彩為 Q07 ➔ 聲音 A 是正確答案 (targetSoundId: 'A')
// 題目 3: 聲音 (Q08_full, Q08_nopoem)，正確答案為 Q08_full ➔ 目標色彩為 Q08 ➔ 聲音 B 是正確答案 (targetSoundId: 'B')
// 題目 4: 聲音 (Q09_nopoem, Q09_full)，正確答案為 Q09_nopoem ➔ 目標色彩為 Q09 ➔ 聲音 A 是正確答案 (targetSoundId: 'A')
// 題目 5: 聲音 (Q10_nopoem, Q10_full)，正確答案為 Q10_nopoem ➔ 目標色彩為 Q10 ➔ 聲音 A 是正確答案 (targetSoundId: 'A')
// 題目 6: 聲音 (Q11_full, Q11_nopoem)，正確答案為 Q11_full ➔ 目標色彩為 Q11 ➔ 聲音 A 是正確答案 (targetSoundId: 'A')
// 題目 7: 聲音 (Q12_nopoem, Q12_full)，正確答案為 Q12_nopoem ➔ 目標色彩為 Q12 ➔ 聲音 A 是正確答案 (targetSoundId: 'A')
// 題目 8: 聲音 (Q13_full, Q13_nopoem)，正確答案為 Q13_full ➔ 目標色彩為 Q13 ➔ 聲音 A 是正確答案 (targetSoundId: 'A')
// 題目 9: 聲音 (Q14_nopoem, Q14_full)，正確答案為 Q14_nopoem ➔ 目標色彩為 Q14 ➔ 聲音 A 是正確答案 (targetSoundId: 'A')
// 題目 10: 聲音 (Q09_nopoem, Q09_full)，正確答案為 Q09_nopoem ➔ 目標色彩為 Q09 ➔ 聲音 A 是正確答案 (targetSoundId: 'A')
export const phase2Questions: Phase2Question[] = [
  {
    id: 1,
    title: '題目 01',
    targetColorHex: rawQuestions[5].hex, // Q06 color
    soundOptions: {
      A: '/sounds/Q06_llm_nopoem.wav',
      B: '/sounds/Q06_llm_full.wav'
    },
    targetSoundId: 'B'
  },
  {
    id: 2,
    title: '題目 02',
    targetColorHex: rawQuestions[6].hex, // Q07 color
    soundOptions: {
      A: '/sounds/Q07_llm_nopoem.wav',
      B: '/sounds/Q07_llm_full.wav'
    },
    targetSoundId: 'A'
  },
  {
    id: 3,
    title: '題目 03',
    targetColorHex: rawQuestions[7].hex, // Q08 color
    soundOptions: {
      A: '/sounds/Q08_llm_nopoem.wav',
      B: '/sounds/Q08_llm_full.wav'
    },
    targetSoundId: 'B'
  },
  {
    id: 4,
    title: '題目 04',
    targetColorHex: rawQuestions[8].hex, // Q09 color
    soundOptions: {
      A: '/sounds/Q09_llm_nopoem.wav',
      B: '/sounds/Q09_llm_full.wav'
    },
    targetSoundId: 'A'
  },
  {
    id: 5,
    title: '題目 05',
    targetColorHex: rawQuestions[9].hex, // Q10 color
    soundOptions: {
      A: '/sounds/Q10_llm_nopoem.wav',
      B: '/sounds/Q10_llm_full.wav'
    },
    targetSoundId: 'A'
  },
  {
    id: 6,
    title: '題目 06',
    targetColorHex: '#E3A857', // Q11 custom color (Curry Gold)
    soundOptions: {
      A: '/sounds/Q11_llm_full.wav',
      B: '/sounds/Q11_llm_nopoem.wav'
    },
    targetSoundId: 'A'
  },
  {
    id: 7,
    title: '題目 07',
    targetColorHex: '#6A8D73', // Q12 custom color (Sage Green)
    soundOptions: {
      A: '/sounds/Q12_llm_nopoem.wav',
      B: '/sounds/Q12_llm_full.wav'
    },
    targetSoundId: 'A'
  },
  {
    id: 8,
    title: '題目 08',
    targetColorHex: '#496A81', // Q13 custom color (Steel Blue)
    soundOptions: {
      A: '/sounds/Q13_llm_full.wav',
      B: '/sounds/Q13_llm_nopoem.wav'
    },
    targetSoundId: 'A'
  },
  {
    id: 9,
    title: '題目 09',
    targetColorHex: '#D07A7C', // Q14 custom color (Rose Dust)
    soundOptions: {
      A: '/sounds/Q14_llm_nopoem.wav',
      B: '/sounds/Q14_llm_full.wav'
    },
    targetSoundId: 'A'
  },
  {
    id: 10,
    title: '題目 10',
    targetColorHex: rawQuestions[8].hex, // Q09 color
    soundOptions: {
      A: '/sounds/Q09_llm_nopoem.wav',
      B: '/sounds/Q09_llm_full.wav'
    },
    targetSoundId: 'A'
  }
];
