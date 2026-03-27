// 六曜計算
// 旧暦の簡易近似テーブル方式 + グレゴリオ暦→旧暦近似変換

const ROKUYO_NAMES = ['大安', '赤口', '先勝', '友引', '先負', '仏滅'] as const;

// 新暦→旧暦の近似変換（Zeller方式ベースの簡易アルゴリズム）
// 完全な精度ではないが、エンタメ用途として十分
function toLunarApprox(date: Date): { month: number; day: number } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 新暦と旧暦のずれ（約29〜50日遅れ）を近似
  // 旧暦は新暦より約1〜1.5ヶ月遅れ
  const jd = gregorianToJD(year, month, day);

  // 旧暦月の開始日を近似計算
  // 朔日（新月）の周期は約29.53日
  const SYNODIC_MONTH = 29.530588;

  // 2024年1月11日 = 旧暦2023年12月1日（朔日）を基準点として使用
  const BASE_JD = gregorianToJD(2024, 1, 11);
  const BASE_LUNAR_MONTH = 12;
  const BASE_LUNAR_YEAR = 2023;

  const daysSinceBase = jd - BASE_JD;
  const lunarMonthsSinceBase = Math.floor(daysSinceBase / SYNODIC_MONTH);
  const dayInMonth = Math.floor(daysSinceBase - lunarMonthsSinceBase * SYNODIC_MONTH) + 1;

  let lunarMonth = BASE_LUNAR_MONTH + lunarMonthsSinceBase;
  // 旧暦月を1〜12に正規化（閏月は無視 — エンタメ用途）
  while (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth <= 0) lunarMonth += 12;

  return { month: lunarMonth, day: Math.max(1, Math.min(30, dayInMonth)) };
}

// グレゴリオ暦→ユリウス日（簡易版）
function gregorianToJD(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

// 六曜の算出
// 六曜 = (旧暦月 + 旧暦日) % 6
export function getRokuyo(date: Date): string {
  const lunar = toLunarApprox(date);
  const index = (lunar.month + lunar.day) % 6;
  return ROKUYO_NAMES[index];
}

// 六曜の説明
export function getRokuyoDescription(rokuyo: string): string {
  switch (rokuyo) {
    case '大安': return '万事に吉。最も縁起の良い日';
    case '友引': return '勝負事に良い日。友を引く';
    case '先勝': return '午前中が吉。急ぎ事に良い';
    case '先負': return '午後が吉。控えめに過ごす日';
    case '赤口': return '正午のみ吉。慎重に';
    case '仏滅': return '万事に凶。静かに過ごす日';
    default: return '';
  }
}
