import { useState, useMemo, useCallback } from 'react';
import { NumbersGameConfig, BirthDate } from '../lib/types';
import { generateLuckyNumbers, calcDailyScore, loadBirthDate, saveBirthDate, calcNumerologyProfile } from '../lib/fortune';
import { getRokuyoDescription } from '../lib/rokuyo';
import BirthDateInput from '../components/BirthDateInput';
import FortuneCalendar from '../components/FortuneCalendar';
import NumbersDigit from '../components/NumbersDigit';
import GlassCard from '../components/GlassCard';
import AdSlot from '../components/AdSlot';

interface Props { config: NumbersGameConfig }

export default function FortunePage({ config }: Props) {
  const [birthDate, setBirthDate] = useState<BirthDate | null>(() => loadBirthDate());

  const handleBirthDateChange = useCallback((bd: BirthDate) => {
    setBirthDate(bd);
    saveBirthDate(bd);
  }, []);

  const profile = useMemo(() => {
    if (!birthDate) return null;
    return calcNumerologyProfile(birthDate, new Date());
  }, [birthDate]);

  const luckyNumbers = useMemo(() => {
    if (!birthDate) return null;
    return generateLuckyNumbers(birthDate, new Date(), config);
  }, [birthDate, config]);

  const dailyScore = useMemo(() => {
    if (!birthDate) return null;
    return calcDailyScore(birthDate, new Date());
  }, [birthDate]);

  const stars = (score: number) => '★'.repeat(score) + '☆'.repeat(5 - score);

  return (
    <div className="page-fortune space-y-6">
      <GlassCard className="p-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">🔮 あなたの数秘プロフィール</h2>
        <BirthDateInput value={birthDate} onChange={handleBirthDateChange} />
        <p className="text-sm text-text-secondary mt-2">※ 生年月日はお使いのブラウザにのみ保存されます（サーバーには送信しません）</p>
      </GlassCard>

      <details className="glass rounded-xl">
        <summary className="px-6 py-4 cursor-pointer text-base font-bold text-text-primary hover:text-accent transition-colors">
          📖 この占いについて
        </summary>
        <div className="px-6 pb-5 space-y-4 text-base text-text-secondary leading-relaxed">
          <div>
            <h4 className="font-bold text-text-primary mb-1">数秘術（ヌメロロジー）とは</h4>
            <p>古代ギリシャの数学者ピタゴラスに由来する占術で、生年月日から算出される数字に固有の意味があるとする考え方です。</p>
          </div>
          <div>
            <h4 className="font-bold text-text-primary mb-1">ラッキーナンバーの算出</h4>
            <p>ライフパス数・誕生数・個人日数を{config.name}の各桁（0〜9）に投影して算出します。{config.digitCount}桁それぞれに最適化された数字が導き出されます。</p>
          </div>
        </div>
      </details>

      {profile && (
        <GlassCard variant="glow" className="p-6 border border-purple-700/40 relative">
          <div className="text-center mb-4 relative">
            <div className="text-5xl mb-2">{profile.emoji}</div>
            <h3 className="text-2xl font-bold" style={{ color: profile.color }}>
              {profile.lifePath} — {profile.systemName}
            </h3>
            <p className="text-base text-text-secondary mt-1">「{profile.systemTitle}」</p>
          </div>
          <div className="glass rounded-lg p-4 mb-4">
            <p className="text-base text-text-secondary leading-relaxed">{profile.description}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="glass rounded-lg p-3">
              <div className="text-sm text-text-secondary">属性</div>
              <div className="font-bold text-text-primary text-lg">{profile.element}</div>
            </div>
            <div className="glass rounded-lg p-3">
              <div className="text-sm text-text-secondary">誕生数</div>
              <div className="font-bold text-text-primary text-lg">{profile.birthNumber}</div>
            </div>
            <div className="glass rounded-lg p-3">
              <div className="text-sm text-text-secondary">個人年数</div>
              <div className="font-bold text-text-primary text-lg">{profile.personalYear}</div>
            </div>
            <div className="glass rounded-lg p-3">
              <div className="text-sm text-text-secondary">個人日数</div>
              <div className="font-bold text-text-primary text-lg">{profile.personalDay}</div>
            </div>
          </div>
        </GlassCard>
      )}

      {luckyNumbers && dailyScore && (
        <GlassCard variant="highlight" className="p-6">
          <h2 className="text-xl font-bold text-text-primary mb-4">🎯 今日の{config.name}ラッキーナンバー</h2>
          <div className="flex items-center gap-3 justify-center mb-4">
            {luckyNumbers.digits.map((d, i) => (
              <NumbersDigit key={i} digit={d} size="lg" isPrediction delay={i * 150} />
            ))}
          </div>
          <div className="space-y-3 mb-4">
            {luckyNumbers.reasoning.map((r, i) => (
              <p key={i} className="text-base text-text-secondary glass rounded-lg p-3">{r}</p>
            ))}
          </div>
          <div className="glass rounded-lg p-5 text-center" style={{ background: 'rgba(60, 20, 90, 0.35)' }}>
            <div className={`text-2xl tracking-wider mb-1 ${dailyScore.score >= 4 ? 'star-twinkle' : ''}`} style={{ color: '#FFD700' }}>
              {stars(dailyScore.score)}
            </div>
            <div className="text-lg font-bold" style={{ color: '#c084fc' }}>{dailyScore.label}</div>
            <p className="text-base text-text-secondary mt-1">{dailyScore.message}</p>
            <p className="text-sm text-text-secondary mt-2">{dailyScore.rokuyo} — {getRokuyoDescription(dailyScore.rokuyo)}</p>
          </div>
        </GlassCard>
      )}

      <AdSlot slotId="SLOT_C_FORTUNE" format="rectangle" />

      {birthDate && (
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold text-text-primary mb-4">📅 購入おすすめカレンダー（4週間）</h2>
          <FortuneCalendar birthDate={birthDate} />
        </GlassCard>
      )}

      <GlassCard className="p-4">
        <p className="text-sm text-text-secondary text-center">
          ※ 占い機能は数秘術に基づくエンターテインメントです。宝くじの当選を保証するものではありません。購入は自己責任でお楽しみください。
        </p>
      </GlassCard>
    </div>
  );
}
