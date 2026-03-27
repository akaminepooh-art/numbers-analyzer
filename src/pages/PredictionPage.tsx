import { useState, useCallback, useMemo } from 'react';
import { NumbersResult, Prediction, PredictionConfig, NumbersGameConfig, BirthDate } from '../lib/types';
import { predictStatistical, predictAI } from '../lib/prediction';
import { generateLuckyNumbers, loadBirthDate, saveBirthDate, calcDailyScore } from '../lib/fortune';
import NumbersDigit from '../components/NumbersDigit';
import BirthDateInput from '../components/BirthDateInput';
import Disclaimer from '../components/Disclaimer';
import GlassCard from '../components/GlassCard';
import AdSlot from '../components/AdSlot';

interface Props { data: NumbersResult[]; config: NumbersGameConfig }

function loadPredictions(gameId: string): Prediction[] {
  try {
    return JSON.parse(localStorage.getItem(`${gameId}_predictions`) || '[]');
  } catch { return []; }
}
function savePredictions(gameId: string, preds: Prediction[]) {
  localStorage.setItem(`${gameId}_predictions`, JSON.stringify(preds.slice(0, 50)));
}

type Method = 'statistical' | 'ai' | 'fortune';

export default function PredictionPage({ data, config }: Props) {
  const [method, setMethod] = useState<Method>('statistical');
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [fortuneResult, setFortuneResult] = useState<{ digits: number[]; reasoning: string[]; profileName: string; profileTitle: string; profileEmoji: string; score: number; scoreLabel: string; scoreMessage: string; rokuyo: string } | null>(null);
  const [history, setHistory] = useState<Prediction[]>(() => loadPredictions(config.id));
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ epoch: 0, total: 0 });
  const [weights, setWeights] = useState({ frequency: 0.3, gap: 0.3, trend: 0.2, correlation: 0.2 });
  const [birthDate, setBirthDate] = useState<BirthDate | null>(() => loadBirthDate());

  const handleBirthDateChange = useCallback((bd: BirthDate) => {
    setBirthDate(bd);
    saveBirthDate(bd);
  }, []);

  const generate = useCallback(async () => {
    if (method === 'fortune') {
      if (!birthDate) return;
      const today = new Date();
      const lucky = generateLuckyNumbers(birthDate, today, config);
      const daily = calcDailyScore(birthDate, today);

      setFortuneResult({
        digits: lucky.digits,
        reasoning: lucky.reasoning,
        profileName: lucky.profile.systemName,
        profileTitle: lucky.profile.systemTitle,
        profileEmoji: lucky.profile.emoji,
        score: daily.score,
        scoreLabel: daily.label,
        scoreMessage: daily.message,
        rokuyo: daily.rokuyo,
      });

      const pred: Prediction = {
        id: crypto.randomUUID(),
        digits: lucky.digits,
        method: 'fortune',
        confidence: daily.score / 5,
        reasoning: `${lucky.profile.systemName}の数秘術 — ${daily.label}`,
        createdAt: new Date().toISOString(),
      };
      setPrediction(pred);
      const newHistory = [pred, ...history];
      setHistory(newHistory);
      savePredictions(config.id, newHistory);
      return;
    }

    if (data.length < 10) return;
    setLoading(true);
    setPrediction(null);
    setFortuneResult(null);
    setProgress({ epoch: 0, total: 0 });

    const predConfig: PredictionConfig = { method, mustInclude: [], mustExclude: [], weights };

    try {
      let pred: Prediction;
      const onProgress = (epoch: number, total: number) => setProgress({ epoch, total });

      if (method === 'statistical') {
        pred = predictStatistical(data, predConfig, config);
      } else {
        pred = await predictAI(data, predConfig, config, onProgress);
      }

      setPrediction(pred);
      const newHistory = [pred, ...history];
      setHistory(newHistory);
      savePredictions(config.id, newHistory);
    } catch (err) {
      console.error('Prediction failed:', err);
    }
    setLoading(false);
  }, [data, method, weights, history, config, birthDate]);

  const methods: { id: Method; label: string; icon: string; desc: string }[] = [
    { id: 'statistical', label: '統計予測', icon: '📊', desc: '桁別出現頻度・ギャップ・桁間相関による加重サンプリング' },
    { id: 'ai', label: 'AI予測', icon: '🧠', desc: 'ニューラルネットワーク(LSTM)による時系列パターン学習' },
    { id: 'fortune', label: '運勢予測', icon: '🔮', desc: '数秘術に基づくラッキーナンバーとストーリー' },
  ];

  const stars = (score: number) => '★'.repeat(score) + '☆'.repeat(5 - score);
  const methodLabel = (m: string) => m === 'statistical' ? '統計' : m === 'ai' ? 'AI' : '運勢';

  return (
    <div className="page-prediction space-y-4">
      <Disclaimer config={config} />

      {/* 手法選択 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {methods.map(m => (
          <button key={m.id}
            onClick={() => { setMethod(m.id); setFortuneResult(null); setPrediction(null); }}
            className={`rounded-xl p-5 border text-left transition-all min-h-[80px] ${
              method === m.id ? 'glass-highlight border-accent' : 'glass border-border hover:border-bg-card-hover'
            }`}>
            <div className={`font-bold text-base ${method === m.id ? 'text-accent' : 'text-text-primary'}`}>{m.icon} {m.label}</div>
            <div className="text-sm text-text-secondary mt-1">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* 運勢予測: 生年月日入力 */}
      {method === 'fortune' && (
        <GlassCard className="p-5">
          <h3 className="text-base font-bold text-text-primary mb-3">生年月日を入力</h3>
          <BirthDateInput value={birthDate} onChange={handleBirthDateChange} />
          {!birthDate && (
            <p className="text-sm text-text-secondary mt-2">生年月日を入力すると、あなた専用のラッキーナンバーを算出します</p>
          )}
        </GlassCard>
      )}

      {/* カスタム設定（統計用） */}
      {method === 'statistical' && (
        <details className="glass rounded-xl">
          <summary className="px-5 py-4 cursor-pointer text-base font-bold text-text-secondary hover:text-text-primary">カスタム設定</summary>
          <div className="px-5 pb-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(weights).map(([key, val]) => (
                <div key={key}>
                  <label className="text-sm text-text-secondary">{
                    key === 'frequency' ? '出現頻度' : key === 'gap' ? 'ギャップ' : key === 'trend' ? 'トレンド' : '桁間相関'
                  }: {val.toFixed(1)}</label>
                  <input type="range" min="0" max="1" step="0.1" value={val}
                    onChange={e => setWeights(w => ({ ...w, [key]: parseFloat(e.target.value) }))}
                    className="w-full accent-amber-500 h-8" />
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      {/* 生成ボタン */}
      <div className="space-y-2">
        <button onClick={generate}
          disabled={loading || (method !== 'fortune' && data.length < 10) || (method === 'fortune' && !birthDate)}
          className="w-full py-4 rounded-xl bg-accent hover:bg-accent-light text-bg-primary font-bold text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]">
          {loading ? (
            progress.total > 0 ? `学習中... ${progress.epoch}/${progress.total} エポック` : '予測を生成中...'
          ) : method === 'fortune'
            ? `🔮 ${config.name} 運勢予測を生成`
            : `🎯 ${config.name} 予測を生成`}
        </button>
        {loading && progress.total > 0 && (
          <div className="w-full bg-bg-card-hover rounded-full h-3 overflow-hidden">
            <div className="neon-progress h-full rounded-full transition-all duration-300"
              style={{ width: `${(progress.epoch / progress.total) * 100}%` }} />
          </div>
        )}
        {loading && method === 'ai' && (
          <p className="text-sm text-text-secondary text-center">ニューラルネットワークを学習中です。数十秒お待ちください...</p>
        )}
      </div>

      {/* 運勢予測結果 */}
      {method === 'fortune' && fortuneResult && (
        <GlassCard variant="glow" className="p-6 border border-purple-500/40 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">{fortuneResult.profileEmoji}</div>
            <h3 className="text-xl font-bold text-purple-400">あなたは「{fortuneResult.profileName}」タイプ</h3>
            <p className="text-sm text-text-secondary mt-1">{fortuneResult.profileTitle}</p>
          </div>
          <div className="space-y-3">
            {fortuneResult.digits.map((d, i) => (
              <div key={i} className="flex items-start gap-3 glass rounded-lg p-4">
                <NumbersDigit digit={d} size="lg" isPrediction delay={i * 150} />
                <p className="text-base text-text-secondary flex-1 pt-1">
                  {i + 1}桁目: {fortuneResult.reasoning[i] || '数秘術が導いた番号です'}
                </p>
              </div>
            ))}
          </div>
          <div className="bg-purple-900/20 rounded-lg p-4 text-center">
            <div className={`text-xl tracking-wider mb-1 ${fortuneResult.score >= 4 ? 'star-twinkle' : ''}`} style={{ color: '#FFD700' }}>
              {stars(fortuneResult.score)}
            </div>
            <div className="text-base font-bold text-purple-300">{fortuneResult.scoreLabel}</div>
            <p className="text-sm text-text-secondary mt-1">{fortuneResult.scoreMessage}（{fortuneResult.rokuyo}）</p>
          </div>
          <p className="text-sm text-text-secondary text-center">※ 数秘術に基づくエンターテインメントです</p>
        </GlassCard>
      )}

      {/* 統計・AI予測結果 */}
      {method !== 'fortune' && prediction && (
        <GlassCard variant="highlight" className="p-6 border border-accent/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-accent">予測結果</h3>
            <span className="text-sm text-text-secondary">{methodLabel(prediction.method)}</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 justify-center mb-4">
            {prediction.digits.map((d, i) => (
              <NumbersDigit key={i} digit={d} size="lg" isPrediction delay={i * 100} />
            ))}
          </div>
          <p className="text-base text-text-secondary text-center">{prediction.reasoning}</p>
          <div className="text-center mt-2">
            <span className="text-sm text-text-secondary">参考信頼度: {(prediction.confidence * 100).toFixed(1)}%（娯楽目的の指標です）</span>
          </div>
        </GlassCard>
      )}

      <AdSlot slotId="SLOT_B_PREDICTION" format="rectangle" />

      {/* 予測履歴 */}
      {history.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-text-primary">予測履歴（{history.length}件）</h3>
            <button onClick={() => { setHistory([]); savePredictions(config.id, []); }}
              className="text-sm text-red-400 hover:text-red-300 px-3 py-2 rounded hover:bg-red-900/20 transition-colors min-h-[40px]">
              すべて削除
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {history.slice(0, 20).map(p => (
              <div key={p.id} className="flex items-center gap-2 sm:gap-3 py-2.5 border-b border-border/50 last:border-0">
                <span className="text-xs sm:text-sm text-text-secondary w-20 sm:w-24 shrink-0">
                  {new Date(p.createdAt).toLocaleDateString('ja-JP')}
                </span>
                <div className="flex gap-1 sm:gap-1.5">
                  {p.digits.map((d, i) => <NumbersDigit key={i} digit={d} size="sm" />)}
                </div>
                <span className="text-xs sm:text-sm text-text-secondary ml-auto shrink-0">{methodLabel(p.method)}</span>
                <button onClick={() => {
                    const newHistory = history.filter(h => h.id !== p.id);
                    setHistory(newHistory);
                    savePredictions(config.id, newHistory);
                  }}
                  className="text-text-secondary hover:text-red-400 shrink-0 p-2 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                  title="この予測を削除">✕</button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
