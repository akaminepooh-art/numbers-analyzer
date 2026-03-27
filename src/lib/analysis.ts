import { NumbersResult, NumbersGameConfig, DigitFrequencyData, DigitGapData, DigitCorrelationData, SumStats, OddEvenStats, RepeatStats } from './types';

/**
 * 桁別出現頻度を計算
 * position: 0-indexed (0=百の位/千の位, 1=十の位, ...)
 */
export function calcDigitFrequency(
  results: NumbersResult[],
  config: NumbersGameConfig,
  position: number,
  lastN?: number
): DigitFrequencyData[] {
  const data = lastN ? results.slice(-lastN) : results;
  const totalRounds = data.length;
  const expected = totalRounds / 10; // 0〜9の10通りなので均等なら1/10
  const counts = new Array(10).fill(0);

  for (const r of data) {
    if (position < r.digits.length) {
      counts[r.digits[position]]++;
    }
  }

  return Array.from({ length: 10 }, (_, i) => ({
    digit: i,
    count: counts[i],
    percentage: totalRounds > 0 ? (counts[i] / totalRounds) * 100 : 0,
    expected,
  }));
}

/**
 * 全桁合算の出現頻度
 */
export function calcOverallFrequency(
  results: NumbersResult[],
  config: NumbersGameConfig,
  lastN?: number
): DigitFrequencyData[] {
  const data = lastN ? results.slice(-lastN) : results;
  const totalRounds = data.length;
  const expected = (totalRounds * config.digitCount) / 10;
  const counts = new Array(10).fill(0);

  for (const r of data) {
    for (const d of r.digits) {
      counts[d]++;
    }
  }

  return Array.from({ length: 10 }, (_, i) => ({
    digit: i,
    count: counts[i],
    percentage: totalRounds > 0 ? (counts[i] / (totalRounds * config.digitCount)) * 100 : 0,
    expected,
  }));
}

/**
 * 桁別ギャップ分析
 */
export function calcDigitGaps(
  results: NumbersResult[],
  config: NumbersGameConfig,
  position: number
): DigitGapData[] {
  const gaps: DigitGapData[] = [];

  for (let digit = 0; digit <= 9; digit++) {
    const appearances: number[] = [];
    for (let i = 0; i < results.length; i++) {
      if (position < results[i].digits.length && results[i].digits[position] === digit) {
        appearances.push(i);
      }
    }

    let currentGap = 0;
    if (appearances.length > 0) {
      currentGap = results.length - 1 - appearances[appearances.length - 1];
    } else {
      currentGap = results.length;
    }

    const intervalGaps: number[] = [];
    for (let i = 1; i < appearances.length; i++) {
      intervalGaps.push(appearances[i] - appearances[i - 1]);
    }
    const averageGap = intervalGaps.length > 0
      ? intervalGaps.reduce((a, b) => a + b, 0) / intervalGaps.length
      : results.length;
    const maxGap = intervalGaps.length > 0 ? Math.max(...intervalGaps) : results.length;

    gaps.push({ digit, currentGap, averageGap, maxGap });
  }

  return gaps;
}

/**
 * 桁間相関分析
 * fromPosition桁目がfromDigitの時、toPosition桁目に何が出やすいか
 */
export function calcDigitCorrelation(
  results: NumbersResult[],
  config: NumbersGameConfig,
  fromPosition: number,
  toPosition: number,
  topN = 20
): DigitCorrelationData[] {
  const correlations = new Map<string, number>();

  for (const r of results) {
    if (fromPosition < r.digits.length && toPosition < r.digits.length) {
      const key = `${r.digits[fromPosition]}-${r.digits[toPosition]}`;
      correlations.set(key, (correlations.get(key) || 0) + 1);
    }
  }

  const result: DigitCorrelationData[] = [];
  for (const [key, count] of correlations.entries()) {
    const [from, to] = key.split('-').map(Number);
    result.push({
      fromDigit: from,
      toDigit: to,
      count,
      label: `${fromPosition + 1}桁目${from}→${toPosition + 1}桁目${to}`,
    });
  }

  result.sort((a, b) => b.count - a.count);
  return result.slice(0, topN);
}

/**
 * 合計値の統計
 */
export function calcSumStats(results: NumbersResult[]): SumStats {
  const sums = results.map(r => r.digits.reduce((a, b) => a + b, 0));
  const mean = sums.reduce((a, b) => a + b, 0) / sums.length;
  const variance = sums.reduce((a, s) => a + (s - mean) ** 2, 0) / sums.length;
  const stddev = Math.sqrt(variance);

  const binSize = 3;
  const minSum = Math.min(...sums);
  const maxSum = Math.max(...sums);
  const bins: { range: string; count: number }[] = [];

  for (let start = Math.floor(minSum / binSize) * binSize; start <= maxSum; start += binSize) {
    const end = start + binSize;
    const count = sums.filter(s => s >= start && s < end).length;
    bins.push({ range: `${start}-${end - 1}`, count });
  }

  return { mean, stddev, min: Math.min(...sums), max: Math.max(...sums), distribution: bins };
}

/**
 * 奇偶パターン分析
 */
export function calcOddEven(results: NumbersResult[], config: NumbersGameConfig): OddEvenStats[] {
  const patterns = new Map<string, number>();

  for (const r of results) {
    const pattern = r.digits.map(d => d % 2 === 1 ? '奇' : '偶').join('');
    patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
  }

  return Array.from(patterns.entries())
    .map(([pattern, count]) => ({
      pattern,
      count,
      percentage: (count / results.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * ゾロ目分析
 */
export function calcRepeatStats(results: NumbersResult[], config: NumbersGameConfig): RepeatStats[] {
  const types = new Map<string, number>();

  for (const r of results) {
    const uniqueDigits = new Set(r.digits).size;
    let type: string;
    if (config.digitCount === 3) {
      if (uniqueDigits === 1) type = 'トリプル';
      else if (uniqueDigits === 2) type = 'ダブル';
      else type = 'シングル';
    } else {
      if (uniqueDigits === 1) type = 'クアドラプル';
      else if (uniqueDigits === 2) {
        // AABB or AAAB パターン判別
        const freq = new Map<number, number>();
        for (const d of r.digits) freq.set(d, (freq.get(d) || 0) + 1);
        const maxCount = Math.max(...freq.values());
        type = maxCount === 3 ? 'トリプル+1' : 'ダブルダブル';
      } else if (uniqueDigits === 3) type = 'ダブル';
      else type = 'シングル';
    }
    types.set(type, (types.get(type) || 0) + 1);
  }

  return Array.from(types.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: (count / results.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 連続数字パターン分析（123, 234等）
 */
export function calcConsecutive(results: NumbersResult[]): { hasConsecutive: number; noConsecutive: number; percentage: number } {
  let hasConsecutive = 0;
  for (const r of results) {
    const sorted = [...r.digits].sort((a, b) => a - b);
    let found = false;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] === 1) {
        found = true;
        break;
      }
    }
    if (found) hasConsecutive++;
  }
  return {
    hasConsecutive,
    noConsecutive: results.length - hasConsecutive,
    percentage: (hasConsecutive / results.length) * 100,
  };
}

/**
 * 桁別トレンド分析 — 各桁の特定数字の移動平均出現率
 */
export function calcDigitTrend(
  results: NumbersResult[],
  position: number,
  digit: number,
  windowSize = 50
): { round: number; rate: number }[] {
  const trend: { round: number; rate: number }[] = [];
  for (let i = windowSize; i <= results.length; i++) {
    const window = results.slice(i - windowSize, i);
    const count = window.filter(r => position < r.digits.length && r.digits[position] === digit).length;
    trend.push({ round: results[i - 1].round, rate: (count / windowSize) * 100 });
  }
  return trend;
}

/**
 * ホット/コールド数字（桁別）
 */
export function getHotCold(freq: DigitFrequencyData[], topN = 5): { hot: DigitFrequencyData[]; cold: DigitFrequencyData[] } {
  const sorted = [...freq].sort((a, b) => b.count - a.count);
  return {
    hot: sorted.slice(0, topN),
    cold: sorted.slice(-topN).reverse(),
  };
}
