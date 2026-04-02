export type NumbersGameType = 'numbers3' | 'numbers4';

export type BetType = 'straight' | 'box' | 'set' | 'mini';

export interface NumbersGameConfig {
  id: NumbersGameType;
  name: string;
  digitCount: number;       // 3 or 4
  maxDigit: number;          // 9（固定）
  drawDays: number[];        // [1,2,3,4,5]（月〜金）
  drawDayLabel: string;      // "月〜金曜"
  color: string;
  colorLight: string;
  emoji: string;
  betTypes: BetType[];
}

export const GAME_CONFIGS: Record<NumbersGameType, NumbersGameConfig> = {
  numbers3: {
    id: 'numbers3',
    name: 'ナンバーズ3',
    digitCount: 3,
    maxDigit: 9,
    drawDays: [1, 2, 3, 4, 5],
    drawDayLabel: '月〜金曜',
    color: '#ef4444',
    colorLight: '#f87171',
    emoji: '3️⃣',
    betTypes: ['straight', 'box', 'set', 'mini'],
  },
  numbers4: {
    id: 'numbers4',
    name: 'ナンバーズ4',
    digitCount: 4,
    maxDigit: 9,
    drawDays: [1, 2, 3, 4, 5],
    drawDayLabel: '月〜金曜',
    color: '#8b5cf6',
    colorLight: '#a78bfa',
    emoji: '4️⃣',
    betTypes: ['straight', 'box', 'set'],
  },
};

export interface NumbersResult {
  round: number;
  date: string;
  digits: number[];          // [3, 7, 2] or [1, 5, 8, 3]
  straightPrize: number;
  boxPrize: number;
  setPrize: number;
  miniPrize?: number;        // ナンバーズ3のみ
}

// 桁別出現頻度
export interface DigitFrequencyData {
  digit: number;             // 0〜9
  count: number;
  percentage: number;
  expected: number;
}

// 桁別ギャップ
export interface DigitGapData {
  digit: number;
  currentGap: number;
  averageGap: number;
  maxGap: number;
}

// 桁間相関
export interface DigitCorrelationData {
  fromDigit: number;
  toDigit: number;
  count: number;
  label: string;
}

// 合計統計
export interface SumStats {
  mean: number;
  stddev: number;
  min: number;
  max: number;
  distribution: { range: string; count: number }[];
}

// 奇偶統計
export interface OddEvenStats {
  pattern: string;
  count: number;
  percentage: number;
}

// ゾロ目統計
export interface RepeatStats {
  type: string;             // "トリプル", "ダブル", "なし" etc
  count: number;
  percentage: number;
}

export interface Prediction {
  id: string;
  digits: number[];
  method: 'statistical' | 'ai' | 'fortune';
  confidence: number;
  reasoning: string;
  createdAt: string;
}

export interface PredictionConfig {
  method: 'statistical' | 'ai' | 'fortune';
  mustInclude: { position: number; digit: number }[];
  mustExclude: { position: number; digit: number }[];
  weights: {
    frequency: number;
    gap: number;
    trend: number;
    correlation: number;
  };
}

export type PageId = 'dashboard' | 'analysis' | 'prediction' | 'history' | 'fortune' | 'legal';

// 占い関連型
export interface BirthDate {
  year: number;
  month: number;
  day: number;
}

export interface NumerologyProfile {
  lifePath: number;
  birthNumber: number;
  personalYear: number;
  personalMonth: number;
  personalDay: number;
  systemName: string;
  systemTitle: string;
  element: string;
  description: string;
  color: string;
  emoji: string;
  coreNumbers: number[];
}

export interface DailyFortune {
  date: string;
  score: number;
  rokuyo: string;
  label: string;
  message: string;
  luckyDigits: number[][];   // [[3,7,2], [1,5,8,3]] — ゲームごと
  gameType?: NumbersGameType;
}

export interface LuckyNumberResult {
  digits: number[];
  reasoning: string[];
  profile: NumerologyProfile;
}

// 申込タイプの日本語ラベル
export const BET_TYPE_LABELS: Record<BetType, string> = {
  straight: 'ストレート',
  box: 'ボックス',
  set: 'セット',
  mini: 'ミニ',
};

// ボックス組み合わせ数を計算
export function calcBoxCombinations(digits: number[]): number {
  const n = digits.length;
  const freq = new Map<number, number>();
  for (const d of digits) {
    freq.set(d, (freq.get(d) || 0) + 1);
  }
  // n! / (n1! * n2! * ... * nk!)
  let numerator = 1;
  for (let i = 2; i <= n; i++) numerator *= i;
  let denominator = 1;
  for (const count of freq.values()) {
    for (let i = 2; i <= count; i++) denominator *= i;
  }
  return numerator / denominator;
}
