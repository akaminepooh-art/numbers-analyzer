import { NumbersResult, NumbersGameConfig } from './types';

export function generateSampleData(config: NumbersGameConfig): NumbersResult[] {
  const data: NumbersResult[] = [];
  const startDate = new Date('2000-10-02');
  const numRounds = 500;

  for (let i = 1; i <= numRounds; i++) {
    const date = new Date(startDate);
    // 月〜金のみ（平日）を概算
    date.setDate(date.getDate() + Math.floor(i * 1.4));

    const digits: number[] = [];
    for (let d = 0; d < config.digitCount; d++) {
      digits.push(Math.floor(Math.random() * 10));
    }

    const result: NumbersResult = {
      round: i,
      date: date.toISOString().split('T')[0],
      digits,
      straightPrize: Math.floor(Math.random() * 80000) + 20000,
      boxPrize: Math.floor(Math.random() * 30000) + 5000,
      setPrize: Math.floor(Math.random() * 50000) + 10000,
    };

    if (config.id === 'numbers3') {
      result.miniPrize = Math.floor(Math.random() * 10000) + 1000;
    }

    data.push(result);
  }

  return data;
}
