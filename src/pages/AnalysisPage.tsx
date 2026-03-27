import { useMemo, useState } from 'react';
import { NumbersResult, NumbersGameConfig } from '../lib/types';
import {
  calcDigitFrequency, calcDigitGaps, calcDigitCorrelation, calcSumStats,
  calcOddEven, calcRepeatStats, calcDigitTrend, getHotCold, calcOverallFrequency,
} from '../lib/analysis';
import NumbersDigit from '../components/NumbersDigit';
import GlassCard from '../components/GlassCard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, LineChart, Line,
  PieChart, Pie, Cell,
} from 'recharts';

const tooltipStyle = { background: 'rgba(15,20,50,0.9)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 8, color: '#f1f5f9' };

interface Props { data: NumbersResult[]; config: NumbersGameConfig }

type Tab = 'frequency' | 'gap' | 'correlation' | 'sum' | 'trend';
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'frequency', label: '出現頻度', icon: '📊' },
  { id: 'gap', label: 'ギャップ', icon: '⏳' },
  { id: 'correlation', label: '相関', icon: '🔗' },
  { id: 'sum', label: '分布', icon: '📉' },
  { id: 'trend', label: 'トレンド', icon: '📈' },
];

export default function AnalysisPage({ data, config }: Props) {
  const [tab, setTab] = useState<Tab>('frequency');
  const [freqRange, setFreqRange] = useState<number>(0);

  return (
    <div className="space-y-4">
      <GlassCard className="p-1.5">
        <div className="flex gap-1.5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 px-2 sm:px-4 py-3 rounded-md text-sm sm:text-base font-bold transition-colors text-center min-h-[44px] ${
                tab === t.id
                  ? 'bg-accent text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <span className="sm:hidden">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5 sm:p-6 min-h-[400px]">
        {tab === 'frequency' && <FrequencyTab data={data} config={config} range={freqRange} setRange={setFreqRange} />}
        {tab === 'gap' && <GapTab data={data} config={config} />}
        {tab === 'correlation' && <CorrelationTab data={data} config={config} />}
        {tab === 'sum' && <SumTab data={data} config={config} />}
        {tab === 'trend' && <TrendTab data={data} config={config} />}
      </GlassCard>
    </div>
  );
}

/* =================== 出現頻度 =================== */
function FrequencyTab({ data, config, range, setRange }: { data: NumbersResult[]; config: NumbersGameConfig; range: number; setRange: (r: number) => void }) {
  const [position, setPosition] = useState<number>(-1); // -1 = 全桁
  const freq = useMemo(() => {
    if (position === -1) return calcOverallFrequency(data, config, range || undefined);
    return calcDigitFrequency(data, config, position, range || undefined);
  }, [data, config, range, position]);
  const { hot, cold } = useMemo(() => getHotCold(freq, 5), [freq]);
  const avgExpected = freq.length > 0 ? freq[0].expected : 0;

  const rangeOptions = [
    { label: '全期間', value: 0 },
    { label: '直近50回', value: 50 },
    { label: '直近100回', value: 100 },
    { label: '直近200回', value: 200 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-bold">桁別出現頻度分析</h3>
        <div className="flex gap-1">
          {rangeOptions.map(o => (
            <button key={o.value} onClick={() => setRange(o.value)}
              className={`px-3 py-2 rounded text-sm font-bold min-h-[36px] ${range === o.value ? 'bg-accent text-bg-primary' : 'bg-bg-card-hover text-text-secondary'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* 桁選択 */}
      <div className="flex gap-1.5">
        <button onClick={() => setPosition(-1)}
          className={`px-3 py-2 rounded text-sm font-bold min-h-[36px] ${position === -1 ? 'bg-accent text-bg-primary' : 'bg-bg-card-hover text-text-secondary'}`}>
          全桁
        </button>
        {Array.from({ length: config.digitCount }, (_, i) => (
          <button key={i} onClick={() => setPosition(i)}
            className={`px-3 py-2 rounded text-sm font-bold min-h-[36px] ${position === i ? 'bg-accent text-bg-primary' : 'bg-bg-card-hover text-text-secondary'}`}>
            {i + 1}桁目
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={freq}>
          <XAxis dataKey="digit" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle}
            formatter={(v: any, _: any, entry: any) => [`${v}回 (${entry.payload.percentage.toFixed(1)}%)`, '出現回数']}
            labelFormatter={l => `数字 ${l}`} />
          <ReferenceLine y={avgExpected} stroke={config.color} strokeDasharray="4 4" />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {freq.map((entry) => (
              <Cell key={entry.digit}
                fill={hot.some(h => h.digit === entry.digit) ? '#ef4444' : cold.some(c => c.digit === entry.digit) ? '#3b82f6' : '#64748b'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-hot font-bold mb-2 text-base">🔥 ホット TOP 5</h4>
          <div className="flex flex-wrap gap-2">
            {hot.map(h => (
              <div key={h.digit} className="flex items-center gap-1.5">
                <NumbersDigit digit={h.digit} size="sm" /><span className="text-sm text-text-secondary">{h.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-cold font-bold mb-2 text-base">❄️ コールド TOP 5</h4>
          <div className="flex flex-wrap gap-2">
            {cold.map(c => (
              <div key={c.digit} className="flex items-center gap-1.5">
                <NumbersDigit digit={c.digit} size="sm" /><span className="text-sm text-text-secondary">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =================== ギャップ =================== */
function GapTab({ data, config }: { data: NumbersResult[]; config: NumbersGameConfig }) {
  const [position, setPosition] = useState(0);
  const gaps = useMemo(() => calcDigitGaps(data, config, position), [data, config, position]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">桁別ギャップ分析</h3>
      <p className="text-base text-text-secondary">各数字が最後に出現してからの回数。平均より長い数字は出やすい可能性があります。</p>

      <div className="flex gap-1.5">
        {Array.from({ length: config.digitCount }, (_, i) => (
          <button key={i} onClick={() => setPosition(i)}
            className={`px-3 py-2 rounded text-sm font-bold min-h-[36px] ${position === i ? 'bg-accent text-bg-primary' : 'bg-bg-card-hover text-text-secondary'}`}>
            {i + 1}桁目
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={gaps}>
          <XAxis dataKey="digit" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle}
            formatter={(v: any, name: any) => [`${typeof v === 'number' ? v.toFixed(1) : v}回`, name === 'currentGap' ? '現在のギャップ' : '平均ギャップ']}
            labelFormatter={l => `数字 ${l}`} />
          <Bar dataKey="currentGap" fill="#ef4444" radius={[2, 2, 0, 0]} name="currentGap" />
          <Bar dataKey="averageGap" fill="#334155" radius={[2, 2, 0, 0]} name="averageGap" />
        </BarChart>
      </ResponsiveContainer>

      <div>
        <h4 className="text-base font-bold text-text-secondary mb-2">ヒートマップ（赤=長期未出現）</h4>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          {gaps.map(g => {
            const intensity = Math.min(1, g.currentGap / Math.max(1, g.averageGap * 2));
            const r = Math.round(59 + intensity * 196);
            const gb = Math.round(130 - intensity * 100);
            return (
              <div key={g.digit}
                className="aspect-square flex items-center justify-center rounded text-lg font-bold text-white min-h-[40px]"
                style={{ background: `rgb(${r},${gb},${gb})` }}
                title={`数字${g.digit}: ${g.currentGap}回未出現 (平均${g.averageGap.toFixed(1)})`}>
                {g.digit}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =================== 桁間相関 =================== */
function CorrelationTab({ data, config }: { data: NumbersResult[]; config: NumbersGameConfig }) {
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(1);
  const corr = useMemo(() => calcDigitCorrelation(data, config, from, to, 20), [data, config, from, to]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">桁間相関分析</h3>
      <p className="text-base text-text-secondary">特定の桁に特定の数字が出た時、他の桁に何が出やすいかの相関</p>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-text-secondary">From:</span>
          {Array.from({ length: config.digitCount }, (_, i) => (
            <button key={i} onClick={() => { setFrom(i); if (i === to) setTo((i + 1) % config.digitCount); }}
              className={`px-3 py-2 rounded text-sm font-bold min-h-[36px] ${from === i ? 'bg-accent text-bg-primary' : 'bg-bg-card-hover text-text-secondary'}`}>
              {i + 1}桁目
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-text-secondary">To:</span>
          {Array.from({ length: config.digitCount }, (_, i) => (
            <button key={i} onClick={() => setTo(i)} disabled={i === from}
              className={`px-3 py-2 rounded text-sm font-bold min-h-[36px] ${to === i ? 'bg-accent text-bg-primary' : i === from ? 'opacity-30' : 'bg-bg-card-hover text-text-secondary'}`}>
              {i + 1}桁目
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={corr} layout="vertical">
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis type="category" dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} width={120} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}回`, '共出現回数']} />
          <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =================== 合計・分布 =================== */
function SumTab({ data, config }: { data: NumbersResult[]; config: NumbersGameConfig }) {
  const sumStats = useMemo(() => calcSumStats(data), [data]);
  const oddEven = useMemo(() => calcOddEven(data, config), [data, config]);
  const repeat = useMemo(() => calcRepeatStats(data, config), [data, config]);
  const COLORS = ['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold">合計値の分布</h3>
        <p className="text-base text-text-secondary mb-3">
          平均: {sumStats.mean.toFixed(1)} / 標準偏差: {sumStats.stddev.toFixed(1)} / 範囲: {sumStats.min}〜{sumStats.max}
        </p>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={sumStats.distribution}>
            <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill={config.color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-bold mb-3">奇数・偶数パターン</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={oddEven} dataKey="count" nameKey="pattern" cx="50%" cy="50%" outerRadius={90}
                label={({ pattern, percentage }: any) => `${pattern} (${percentage.toFixed(1)}%)`}>
                {oddEven.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-3">ゾロ目パターン</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={repeat} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={90}
                label={({ type, percentage }: any) => `${type} (${percentage.toFixed(1)}%)`}>
                {repeat.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* =================== トレンド =================== */
function TrendTab({ data, config }: { data: NumbersResult[]; config: NumbersGameConfig }) {
  const [position, setPosition] = useState(0);
  const [selectedDigits, setSelectedDigits] = useState<number[]>([0, 3, 5, 7, 9]);
  const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  const trendData = useMemo(() => {
    if (data.length < 60) return [];
    const windowSize = 50;
    const result: Record<string, number | string>[] = [];
    for (let i = windowSize; i <= data.length; i++) {
      const entry: Record<string, number | string> = { round: data[i - 1].round };
      for (const digit of selectedDigits) {
        const window = data.slice(i - windowSize, i);
        const count = window.filter(r => position < r.digits.length && r.digits[position] === digit).length;
        entry[`d${digit}`] = (count / windowSize) * 100;
      }
      result.push(entry);
    }
    return result;
  }, [data, selectedDigits, position]);

  const toggleDigit = (d: number) => {
    setSelectedDigits(prev => prev.includes(d) ? prev.filter(n => n !== d) : [...prev, d].slice(-5));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">桁別トレンド分析（50回移動平均）</h3>

      <div className="flex gap-1.5">
        {Array.from({ length: config.digitCount }, (_, i) => (
          <button key={i} onClick={() => setPosition(i)}
            className={`px-3 py-2 rounded text-sm font-bold min-h-[36px] ${position === i ? 'bg-accent text-bg-primary' : 'bg-bg-card-hover text-text-secondary'}`}>
            {i + 1}桁目
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }, (_, i) => (
          <button key={i} onClick={() => toggleDigit(i)}
            className={`w-9 h-9 rounded text-sm font-bold transition-colors min-h-[36px] ${
              selectedDigits.includes(i) ? 'bg-accent text-bg-primary' : 'bg-bg-card-hover text-text-secondary hover:text-text-primary'
            }`}>
            {i}
          </button>
        ))}
      </div>
      <p className="text-sm text-text-secondary">数字をクリックして表示/非表示（最大5つ）</p>

      {trendData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <XAxis dataKey="round" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(v: any, name: any) => [`${typeof v === 'number' ? v.toFixed(1) : v}%`, `数字 ${name.slice(1)}`]} />
            {selectedDigits.map((digit, i) => (
              <Line key={digit} type="monotone" dataKey={`d${digit}`} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-text-secondary text-base text-center py-8">データが不足しています（60回以上必要）</p>
      )}
    </div>
  );
}
