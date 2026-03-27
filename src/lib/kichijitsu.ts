// 吉日判定（大安・一粒万倍日・天赦日・寅の日）
import { getRokuyo } from './rokuyo';

interface KichijitsuInfo {
  name: string;
  emoji: string;
  color: string;
}

// 一粒万倍日のテーブル（旧暦の月に対する日）
// 1月: 3,18  2月: 2,17  3月: 1,16  4月: 1,16
// 5月: 14,29  6月: 13,28  7月: 12,27  8月: 12,27
// 9月: 11,26  10月: 10,25  11月: 9,24  12月: 9,24
const ICHIRYUU_DAYS: Record<number, number[]> = {
  1: [3, 18], 2: [2, 17], 3: [1, 16], 4: [1, 16],
  5: [14, 29], 6: [13, 28], 7: [12, 27], 8: [12, 27],
  9: [11, 26], 10: [10, 25], 11: [9, 24], 12: [9, 24],
};

// 簡易旧暦月算出（概算）
function getLunarMonth(date: Date): number {
  // 太陰暦の近似: グレゴリオ暦から約1ヶ月遅れ
  const m = date.getMonth(); // 0-indexed
  return ((m + 11) % 12) + 1; // 1月始まり、1ヶ月遅れ
}

function isIchiryu(date: Date): boolean {
  const lunarMonth = getLunarMonth(date);
  const day = date.getDate();
  const days = ICHIRYUU_DAYS[lunarMonth] || [];
  return days.includes(day);
}

// 寅の日: 十二支「寅」は12日周期
// 2024/1/1 = 甲辰年なので基準日から計算
function isToraNoHi(date: Date): boolean {
  const base = new Date(2024, 0, 3); // 2024/1/3 は寅の日
  const diff = Math.floor((date.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  return ((diff % 12) + 12) % 12 === 0;
}

// 天赦日: 年に5-6回のみ（2024-2027の主な天赦日を固定テーブル）
const TENSHA_DATES: string[] = [
  // 2025
  '2025-01-06', '2025-03-22', '2025-05-21', '2025-06-04', '2025-08-18', '2025-10-02', '2025-11-01',
  // 2026
  '2026-01-16', '2026-03-31', '2026-05-15', '2026-06-28', '2026-09-11', '2026-10-25', '2026-12-09',
  // 2027
  '2027-02-10', '2027-04-11', '2027-05-25', '2027-07-08', '2027-09-05', '2027-10-19', '2027-12-03',
];

function isTensha(date: Date): boolean {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return TENSHA_DATES.includes(dateStr);
}

export function getKichijitsu(date: Date): KichijitsuInfo[] {
  const result: KichijitsuInfo[] = [];

  // 大安チェック
  const rokuyo = getRokuyo(date);
  if (rokuyo === '大安') {
    result.push({ name: '大安', emoji: '🌟', color: '#FFD700' });
  }

  // 一粒万倍日チェック
  if (isIchiryu(date)) {
    result.push({ name: '一粒万倍日', emoji: '🌾', color: '#10B981' });
  }

  // 天赦日チェック
  if (isTensha(date)) {
    result.push({ name: '天赦日', emoji: '✨', color: '#8B5CF6' });
  }

  // 寅の日チェック
  if (isToraNoHi(date)) {
    result.push({ name: '寅の日', emoji: '🐯', color: '#F59E0B' });
  }

  return result;
}
