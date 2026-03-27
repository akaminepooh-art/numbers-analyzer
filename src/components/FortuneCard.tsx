import { useMemo } from 'react';
import { NumbersGameConfig } from '../lib/types';
import { generateLuckyNumbers, calcDailyScore, loadBirthDate } from '../lib/fortune';
import NumbersDigit from './NumbersDigit';

interface Props {
  config: NumbersGameConfig;
  onNavigateToFortune: () => void;
}

export default function FortuneCard({ config, onNavigateToFortune }: Props) {
  const birthDate = useMemo(() => loadBirthDate(), []);

  const fortune = useMemo(() => {
    if (!birthDate) return null;
    const today = new Date();
    const lucky = generateLuckyNumbers(birthDate, today, config);
    const daily = calcDailyScore(birthDate, today);
    return { lucky, daily };
  }, [birthDate, config]);

  const stars = (score: number) => '★'.repeat(score) + '☆'.repeat(5 - score);

  if (!birthDate) {
    return (
      <button
        onClick={onNavigateToFortune}
        className="glass-glow rounded-xl p-5 border border-purple-700/40 text-left w-full hover:brightness-110 transition-all min-h-[120px]"
      >
        <div className="text-sm text-text-secondary mb-1">今日の購入運</div>
        <div className="text-xl font-bold text-purple-400">🔮 占いを設定</div>
        <div className="text-sm text-text-secondary mt-2">生年月日を入力してラッキーナンバーを取得</div>
      </button>
    );
  }

  if (!fortune) return null;

  return (
    <button
      onClick={onNavigateToFortune}
      className="glass-glow rounded-xl p-5 border border-purple-700/40 text-left w-full hover:brightness-110 transition-all"
    >
      <div className="text-sm text-text-secondary mb-1">今日の購入運</div>
      <div className={`text-xl tracking-wider ${fortune.daily.score >= 4 ? 'star-twinkle' : ''}`} style={{ color: '#FFD700' }}>
        {stars(fortune.daily.score)}
      </div>
      <div className="text-base font-bold text-purple-300 mt-1">
        {fortune.daily.label}
      </div>
      <div className="flex gap-1 mt-2">
        {fortune.lucky.digits.map((d, i) => (
          <NumbersDigit key={i} digit={d} size="sm" />
        ))}
      </div>
      <div className="text-sm text-text-secondary mt-2">
        占い詳細へ →
      </div>
    </button>
  );
}
