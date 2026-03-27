import { BirthDate, NumerologyProfile, LuckyNumberResult, DailyFortune, NumbersGameConfig, NumbersGameType, GAME_CONFIGS } from './types';
import { getNumerologyProfile } from './numerology-data';
import { getRokuyo } from './rokuyo';

// デジタルルート（マスターナンバー対応）
export function digitalRoot(n: number): number {
  if (n === 11 || n === 22 || n === 33) return n;
  while (n >= 10) {
    n = String(n).split('').reduce((sum, d) => sum + parseInt(d), 0);
    if (n === 11 || n === 22 || n === 33) return n;
  }
  return n;
}

// ライフパス数
export function calcLifePath(year: number, month: number, day: number): number {
  const y = digitalRoot(year);
  const m = digitalRoot(month);
  const d = digitalRoot(day);
  return digitalRoot(y + m + d);
}

// 誕生数
export function calcBirthNumber(day: number): number {
  return digitalRoot(day);
}

// 個人年数
export function calcPersonalYear(birthMonth: number, birthDay: number, currentYear: number): number {
  const m = digitalRoot(birthMonth);
  const d = digitalRoot(birthDay);
  const y = digitalRoot(currentYear);
  return digitalRoot(m + d + y);
}

// 個人月数
export function calcPersonalMonth(personalYear: number, currentMonth: number): number {
  return digitalRoot(personalYear + currentMonth);
}

// 個人日数
export function calcPersonalDay(personalMonth: number, currentDay: number): number {
  return digitalRoot(personalMonth + currentDay);
}

// 全数秘術プロフィールの算出
export function calcNumerologyProfile(birthDate: BirthDate, today: Date): NumerologyProfile {
  const lifePath = calcLifePath(birthDate.year, birthDate.month, birthDate.day);
  const birthNumber = calcBirthNumber(birthDate.day);
  const personalYear = calcPersonalYear(birthDate.month, birthDate.day, today.getFullYear());
  const personalMonth = calcPersonalMonth(personalYear, today.getMonth() + 1);
  const personalDay = calcPersonalDay(personalMonth, today.getDate());

  const base = getNumerologyProfile(lifePath);

  return {
    lifePath,
    birthNumber,
    personalYear,
    personalMonth,
    personalDay,
    ...base,
  };
}

// ナンバーズ用ラッキーナンバー生成（0〜9の桁を digitCount 個生成）
export function generateLuckyNumbers(
  birthDate: BirthDate,
  today: Date,
  config: NumbersGameConfig
): LuckyNumberResult {
  const profile = calcNumerologyProfile(birthDate, today);
  const { lifePath, birthNumber, personalDay } = profile;

  const digits: number[] = [];
  for (let pos = 0; pos < config.digitCount; pos++) {
    // 各桁ごとに異なるシード値を使って0〜9の数字を算出
    const seed1 = (lifePath * 7 + pos * 13 + birthDate.day * 3) % 10;
    const seed2 = (birthNumber * personalDay * (pos + 1) + today.getDate()) % 10;
    const seed3 = (personalDay * 11 + pos * 17 + birthDate.month * 5) % 10;

    // 3つのシードを日替わりで混合
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const digit = (seed1 + seed2 + seed3 + dayOfYear * (pos + 1)) % 10;
    digits.push(digit);
  }

  const profileData = getNumerologyProfile(lifePath);
  const reasoning: string[] = [];

  reasoning.push(
    `ライフパス数${lifePath}（${profileData.systemName}）を${config.name}の各桁（0〜9）に投影した、あなたの核となる数字です`
  );

  if (config.digitCount >= 2) {
    reasoning.push(
      `誕生数${birthNumber}と今日の個人日数${personalDay}の共鳴を${config.name}の${config.digitCount}桁の流れに乗せて導き出された数字です`
    );
  }

  if (config.digitCount >= 3) {
    reasoning.push(
      `${profileData.systemName}タイプの波動が今日特に引き寄せている数字の組み合わせです`
    );
  }

  if (config.digitCount >= 4) {
    reasoning.push(
      `個人日数${personalDay}と今日の日付の数秘的共鳴から浮かび上がった数字です`
    );
  }

  return { digits, reasoning, profile };
}

// 属性マッピング
const ELEMENT_GROUPS: Record<string, number[]> = {
  '火': [1, 9],
  '水': [2, 6],
  '風': [3, 5],
  '地': [4, 8, 22],
  '光': [7, 11, 33],
};

function isSameElement(personalDay: number, lifePath: number): boolean {
  for (const nums of Object.values(ELEMENT_GROUPS)) {
    const pdMatch = nums.includes(personalDay) || nums.includes(personalDay > 9 ? digitalRoot(personalDay) : personalDay);
    const lpMatch = nums.includes(lifePath) || nums.includes(lifePath > 9 ? digitalRoot(lifePath) : lifePath);
    if (pdMatch && lpMatch) return true;
  }
  return false;
}

// 日運スコア算出
export function calcDailyScore(
  birthDate: BirthDate,
  targetDate: Date,
): { score: number; label: string; message: string; personalDay: number; rokuyo: string } {
  const profile = calcNumerologyProfile(birthDate, targetDate);
  const { lifePath, birthNumber, personalDay } = profile;
  const rokuyo = getRokuyo(targetDate);

  let personalScore = 0;
  if (personalDay === lifePath) {
    personalScore = 3;
  } else if (personalDay === birthNumber) {
    personalScore = 2;
  } else if (isSameElement(personalDay, lifePath)) {
    personalScore = 1;
  }

  let rokuyoScore = 0;
  if (rokuyo === '大安') rokuyoScore = 2;
  else if (rokuyo === '友引' || rokuyo === '先勝' || rokuyo === '先負') rokuyoScore = 1;

  const total = personalScore + rokuyoScore;

  let score: number;
  let label: string;
  let message: string;

  if (total >= 5) {
    score = 5;
    label = '最高の購入日';
    message = '数字の神様があなたを呼んでいます';
  } else if (total === 4) {
    score = 4;
    label = '強くおすすめ';
    message = '今日の流れに乗りましょう';
  } else if (total === 3) {
    score = 3;
    label = '良い日';
    message = '直感を信じて';
  } else if (total === 2) {
    score = 2;
    label = '控えめに';
    message = '少額で楽しむ日';
  } else {
    score = 1;
    label = '見送り推奨';
    message = '次の好機を待ちましょう';
  }

  return { score, label, message, personalDay, rokuyo };
}

// 4週間分の購入おすすめカレンダー生成（ナンバーズは月〜金）
export function generateFortuneCalendar(
  birthDate: BirthDate,
  startDate: Date,
): DailyFortune[] {
  const fortunes: DailyFortune[] = [];
  const gameTypes: NumbersGameType[] = ['numbers3', 'numbers4'];

  for (let i = 0; i < 28; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();

    // ナンバーズは月〜金（1〜5）に抽選
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // 両ゲームとも同じ日に抽選
      for (const gt of gameTypes) {
        const gc = GAME_CONFIGS[gt];
        const { score, label, message, rokuyo } = calcDailyScore(birthDate, date);
        const lucky = generateLuckyNumbers(birthDate, date, gc);

        fortunes.push({
          date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
          score,
          rokuyo,
          label,
          message,
          luckyDigits: [lucky.digits],
          gameType: gt,
        });
      }
    }
  }

  return fortunes;
}

// localStorage から生年月日を取得
export function loadBirthDate(): BirthDate | null {
  try {
    const stored = localStorage.getItem('fortune_birthdate');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

// localStorage に生年月日を保存
export function saveBirthDate(birthDate: BirthDate): void {
  localStorage.setItem('fortune_birthdate', JSON.stringify(birthDate));
}
