import { useMemo } from 'react';
import { NumbersResult, NumbersGameConfig, PageId, BET_TYPE_LABELS, calcBoxCombinations } from '../lib/types';
import { calcOverallFrequency, getHotCold, calcConsecutive, calcRepeatStats } from '../lib/analysis';
import NumbersDigit from '../components/NumbersDigit';
import GlassCard from '../components/GlassCard';
import FortuneCard from '../components/FortuneCard';
import { getKichijitsu } from '../lib/kichijitsu';
import AdSlot from '../components/AdSlot';
import ShareQR from '../components/ShareQR';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Props {
  data: NumbersResult[];
  config: NumbersGameConfig;
  onNavigate: (page: PageId) => void;
}

export default function DashboardPage({ data, config, onNavigate }: Props) {
  const latest = data[data.length - 1];
  const freq = useMemo(() => calcOverallFrequency(data, config), [data, config]);
  const { hot, cold } = useMemo(() => getHotCold(freq), [freq]);
  const repeat = useMemo(() => calcRepeatStats(data, config), [data, config]);
  const consec = useMemo(() => calcConsecutive(data), [data]);
  const avgExpected = freq.length > 0 ? freq[0].expected : 0;

  const nextDraw = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    // 月〜金が抽選日、最も近い平日を探す
    let daysToNext = 0;
    for (let i = 0; i <= 7; i++) {
      const day = (currentDay + i) % 7;
      if (config.drawDays.includes(day)) {
        if (i === 0 && now.getHours() >= 19) continue; // 当日19時以降は翌営業日
        daysToNext = i;
        break;
      }
    }
    if (daysToNext === 0 && now.getHours() >= 19) {
      // 金曜19時以降→次の月曜
      for (let i = 1; i <= 7; i++) {
        const day = (currentDay + i) % 7;
        if (config.drawDays.includes(day)) {
          daysToNext = i;
          break;
        }
      }
    }
    const next = new Date(now);
    next.setDate(next.getDate() + daysToNext);
    return next;
  }, [config.drawDays]);

  const kichijitsu = useMemo(() => getKichijitsu(nextDraw), [nextDraw]);

  if (!latest) return <div className="p-8 text-center text-text-secondary text-lg">データがありません</div>;

  const boxCombo = calcBoxCombinations(latest.digits);

  return (
    <div className="space-y-5">
      {/* ヒーロー: 最新結果 */}
      <GlassCard variant="glow" animate stagger={1} className="p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 relative">
          <h2 className="text-xl font-bold text-text-primary">
            最新結果 — 第{latest.round}回
          </h2>
          <span className="text-sm text-text-secondary">{latest.date}</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 justify-center mb-5">
          {latest.digits.map((d, i) => (
            <NumbersDigit key={i} digit={d} size="lg" delay={i * 100} />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <Stat label="ストレート" value={`¥${latest.straightPrize.toLocaleString()}`} />
          <Stat label="ボックス" value={latest.boxPrize > 0 ? `¥${latest.boxPrize.toLocaleString()}` : '-'} />
          <Stat label="セット" value={`¥${latest.setPrize.toLocaleString()}`} />
          {config.id === 'numbers3' && latest.miniPrize !== undefined ? (
            <Stat label="ミニ" value={`¥${latest.miniPrize.toLocaleString()}`} />
          ) : (
            <Stat label="ボックス組数" value={`${boxCombo}通り`} />
          )}
        </div>
        <div className="flex gap-2 mt-3 justify-center flex-wrap">
          {config.betTypes.map(bt => (
            <span key={bt} className="text-xs px-2 py-1 rounded-full glass text-text-secondary">
              {BET_TYPE_LABELS[bt]}
            </span>
          ))}
        </div>
      </GlassCard>

      <AdSlot slotId="SLOT_A_DASHBOARD" format="horizontal" />

      {/* 情報カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard variant="highlight" animate stagger={2} className="p-5">
          <div className="text-sm text-text-secondary mb-1">次回抽選日</div>
          <div className="text-3xl font-bold text-accent">
            {nextDraw.getMonth() + 1}/{nextDraw.getDate()}（{['日','月','火','水','木','金','土'][nextDraw.getDay()]}）
          </div>
          <div className="text-sm text-text-secondary mt-1">{config.drawDayLabel} 18:45 頃抽選</div>
          {kichijitsu.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {kichijitsu.map(k => (
                <span key={k.name} className="text-xs px-2 py-1 rounded-full font-bold" style={{ backgroundColor: k.color + '22', color: k.color }}>
                  {k.emoji} {k.name}
                </span>
              ))}
            </div>
          )}
        </GlassCard>
        <GlassCard animate stagger={2} className="p-5">
          <div className="text-sm text-text-secondary mb-1">最新抽選日</div>
          <div className="text-2xl font-bold text-text-primary">{latest?.date || '—'}</div>
          <div className="text-sm text-text-secondary mt-1">{config.name} 全{data.length}回</div>
        </GlassCard>
        <GlassCard animate stagger={3} className="p-5">
          <div className="text-sm text-text-secondary mb-1">ゾロ目</div>
          {repeat.length > 0 && (
            <>
              <div className="text-2xl font-bold text-text-primary">{repeat[0].type}</div>
              <div className="text-sm text-text-secondary mt-1">{repeat[0].percentage.toFixed(1)}%（最多パターン）</div>
            </>
          )}
        </GlassCard>
        <FortuneCard config={config} onNavigateToFortune={() => onNavigate('fortune')} />
      </div>

      {/* 全桁合算頻度グラフ */}
      <GlassCard animate stagger={4} className="p-4 sm:p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4">数字別出現頻度（全桁合算・全期間）</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={freq}>
            <XAxis dataKey="digit" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: 'rgba(15,20,50,0.9)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 8, color: '#f1f5f9', backdropFilter: 'blur(8px)' }} formatter={(v: any) => [`${v}回`, '出現回数']} labelFormatter={(l) => `数字 ${l}`} />
            <ReferenceLine y={avgExpected} stroke={config.color} strokeDasharray="4 4" label={{ value: '期待値', fill: config.color, fontSize: 11 }} />
            <Bar dataKey="count" radius={[2, 2, 0, 0]} fill={config.color} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* ホット & コールド */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard animate stagger={5} className="p-5">
          <h3 className="text-base font-bold text-hot mb-3">🔥 ホット数字 TOP 5</h3>
          <div className="flex flex-wrap gap-2">
            {hot.map(h => (
              <div key={h.digit} className="flex items-center gap-1.5">
                <NumbersDigit digit={h.digit} size="sm" />
                <span className="text-sm text-text-secondary">{h.count}回</span>
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard animate stagger={5} className="p-5">
          <h3 className="text-base font-bold text-cold mb-3">❄️ コールド数字 TOP 5</h3>
          <div className="flex flex-wrap gap-2">
            {cold.map(c => (
              <div key={c.digit} className="flex items-center gap-1.5">
                <NumbersDigit digit={c.digit} size="sm" />
                <span className="text-sm text-text-secondary">{c.count}回</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <ShareQR cardMode />
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-sm text-text-secondary">{label}</div>
      <div className={`text-base font-bold ${gold ? 'gold-shimmer' : 'text-text-primary'}`}>{value}</div>
    </div>
  );
}
