export interface ColorOption {
  id: 'A' | 'B' | 'C' | 'D';
  hex: string;
  label: string;
}

export interface SurveyQuestion {
  id: number;
  audioUrl: string;
  title: string;
  colorOptions: [ColorOption, ColorOption, ColorOption, ColorOption];
  targetColorId?: 'A' | 'B' | 'C' | 'D';
}

export const surveyQuestions: SurveyQuestion[] = [
  {
    id: 1,
    audioUrl: '/sounds/Q01_llm_full.wav',
    title: '題目 01',
    colorOptions: [
      { id: 'A', hex: '#FBFBD5', label: '淡米黃' },
      { id: 'B', hex: '#FAF1D2', label: '暖米黃' },
      { id: 'C', hex: '#E0E6D3', label: '冷灰綠' },
      { id: 'D', hex: '#7A8599', label: '深灰藍' }
    ],
    targetColorId: 'A'
  },
  {
    id: 2,
    audioUrl: '/sounds/Q02_llm_full.wav',
    title: '題目 02',
    colorOptions: [
      { id: 'A', hex: '#E2F3BA', label: '嫩綠' },
      { id: 'B', hex: '#D4EBAA', label: '草綠' },
      { id: 'C', hex: '#C2F0E8', label: '薄荷綠' },
      { id: 'D', hex: '#E8AD8D', label: '粉橙' }
    ],
    targetColorId: 'A'
  },
  {
    id: 3,
    audioUrl: '/sounds/Q03_llm_full.wav',
    title: '題目 03',
    colorOptions: [
      { id: 'A', hex: '#5C563D', label: '深橄欖棕' },
      { id: 'B', hex: '#695F43', label: '大地棕綠' },
      { id: 'C', hex: '#4A5859', label: '深冷藍灰' },
      { id: 'D', hex: '#D9C3A3', label: '淺沙色' }
    ],
    targetColorId: 'A'
  },
  {
    id: 4,
    audioUrl: '/sounds/Q04_llm_full.wav',
    title: '題目 04',
    colorOptions: [
      { id: 'A', hex: '#A2A9A4', label: '鼠尾草灰' },
      { id: 'B', hex: '#98A39E', label: '濃灰綠' },
      { id: 'C', hex: '#B8ADAC', label: '暖灰粉' },
      { id: 'D', hex: '#3B4252', label: '夜空藍' }
    ],
    targetColorId: 'A'
  },
  {
    id: 5,
    audioUrl: '/sounds/Q05_llm_full.wav',
    title: '題目 05',
    colorOptions: [
      { id: 'A', hex: '#A2A9A4', label: '鼠尾草灰' },
      { id: 'B', hex: '#ADC0B5', label: '青灰綠' },
      { id: 'C', hex: '#AFAAA0', label: '麻灰' },
      { id: 'D', hex: '#D68C8C', label: '珊瑚粉' }
    ],
    targetColorId: 'A'
  },
  {
    id: 6,
    audioUrl: '/sounds/Q06_llm_full.wav',
    title: '題目 06',
    colorOptions: [
      { id: 'A', hex: '#968CBD', label: '薰衣草紫' },
      { id: 'B', hex: '#8A7FB8', label: '芋紫' },
      { id: 'C', hex: '#8A9BB8', label: '霧藍' },
      { id: 'D', hex: '#C2A878', label: '燕麥黃' }
    ],
    targetColorId: 'A'
  },
  {
    id: 7,
    audioUrl: '/sounds/Q07_llm_full.wav',
    title: '題目 07',
    colorOptions: [
      { id: 'A', hex: '#CEBADA', label: '丁香紫' },
      { id: 'B', hex: '#D8C4E6', label: '粉紫' },
      { id: 'C', hex: '#B8C8E0', label: '粉藍' },
      { id: 'D', hex: '#7A6052', label: '可可棕' }
    ],
    targetColorId: 'A'
  },
  {
    id: 8,
    audioUrl: '/sounds/Q08_llm_full.wav',
    title: '題目 08',
    colorOptions: [
      { id: 'A', hex: '#EDBDBD', label: '霧粉' },
      { id: 'B', hex: '#EBD0D0', label: '柔粉' },
      { id: 'C', hex: '#E6DFD3', label: '米白' },
      { id: 'D', hex: '#6B8B8E', label: '藍綠' }
    ],
    targetColorId: 'A'
  },
  {
    id: 9,
    audioUrl: '/sounds/Q09_llm_full.wav',
    title: '題目 09',
    colorOptions: [
      { id: 'A', hex: '#584F48', label: '深岩灰' },
      { id: 'B', hex: '#665B54', label: '暖泥棕' },
      { id: 'C', hex: '#485258', label: '暗灰藍' },
      { id: 'D', hex: '#E0D8B8', label: '亞麻黃' }
    ],
    targetColorId: 'A'
  },
  {
    id: 10,
    audioUrl: '/sounds/Q10_llm_full.wav',
    title: '題目 10',
    colorOptions: [
      { id: 'A', hex: '#E4DB90', label: '鵝黃' },
      { id: 'B', hex: '#D6CD7C', label: '芥末黃' },
      { id: 'C', hex: '#D2E490', label: '黃綠' },
      { id: 'D', hex: '#8B7082', label: '灰紫' }
    ],
    targetColorId: 'A'
  }
];
