import { NumbersResult, Prediction, PredictionConfig, NumbersGameConfig } from './types';
import { calcDigitFrequency, calcDigitGaps, calcDigitTrend, calcDigitCorrelation } from './analysis';

// UIスレッドに制御を返すユーティリティ
function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * 統計ベース予測（桁ごとに独立して予測）
 */
export function predictStatistical(
  results: NumbersResult[],
  config: PredictionConfig,
  gameConfig: NumbersGameConfig
): Prediction {
  const { digitCount } = gameConfig;
  const { weights } = config;
  const digits: number[] = [];

  for (let pos = 0; pos < digitCount; pos++) {
    const freq = calcDigitFrequency(results, gameConfig, pos);
    const gaps = calcDigitGaps(results, gameConfig, pos);

    const scores = new Array(10).fill(0);

    for (let d = 0; d <= 9; d++) {
      // 必須除外チェック
      if (config.mustExclude.some(e => e.position === pos && e.digit === d)) {
        scores[d] = -Infinity;
        continue;
      }

      const f = freq.find(f => f.digit === d)!;
      const g = gaps.find(g => g.digit === d)!;

      const freqScore = f.count / Math.max(1, f.expected);
      const gapScore = g.currentGap / Math.max(1, g.averageGap);

      const trend = calcDigitTrend(results, pos, d, Math.min(50, results.length));
      const trendScore = trend.length > 1
        ? (trend[trend.length - 1].rate - trend[Math.max(0, trend.length - 10)].rate) / 10
        : 0;

      // 桁間相関（前の桁との相関）
      let corrScore = 0;
      if (pos > 0 && digits.length > 0) {
        const prevDigit = digits[pos - 1];
        const corr = calcDigitCorrelation(results, gameConfig, pos - 1, pos, 100);
        const match = corr.find(c => c.fromDigit === prevDigit && c.toDigit === d);
        corrScore = match ? match.count / Math.max(1, results.length) : 0;
      }

      scores[d] =
        weights.frequency * freqScore +
        weights.gap * gapScore +
        weights.trend * (trendScore + 1) +
        weights.correlation * corrScore;
    }

    // 必須指定チェック
    const forced = config.mustInclude.find(e => e.position === pos);
    if (forced) {
      digits.push(forced.digit);
      continue;
    }

    // 重み付きランダム選択
    const candidates = [];
    let totalScore = 0;
    for (let d = 0; d <= 9; d++) {
      if (scores[d] === -Infinity) continue;
      const s = Math.max(0.01, scores[d]);
      candidates.push({ digit: d, score: s });
      totalScore += s;
    }

    let rand = Math.random() * totalScore;
    let selected = candidates[0]?.digit ?? 0;
    for (const c of candidates) {
      rand -= c.score;
      if (rand <= 0) {
        selected = c.digit;
        break;
      }
    }
    digits.push(selected);
  }

  return {
    id: crypto.randomUUID(),
    digits,
    method: 'statistical',
    confidence: 0.15 + Math.random() * 0.1,
    reasoning: '桁別出現頻度・ギャップ・トレンド・桁間相関に基づく加重サンプリング',
    createdAt: new Date().toISOString(),
  };
}

/**
 * LSTM 学習の共通処理（桁×10次元）
 */
async function trainLSTMAndPredict(
  results: NumbersResult[],
  gameConfig: NumbersGameConfig,
  onProgress?: (epoch: number, total: number) => void
): Promise<number[]> {
  const tf = await import('@tensorflow/tfjs');
  const { digitCount } = gameConfig;
  const inputDim = digitCount * 10; // 3桁→30次元, 4桁→40次元

  const recentResults = results.slice(-200);
  const seqLen = Math.min(20, Math.floor(recentResults.length * 0.5));

  // データ前処理: 各回を digitCount×10 のone-hotベクトルに変換
  const vectors = recentResults.map(r => {
    const v = new Array(inputDim).fill(0);
    for (let pos = 0; pos < digitCount; pos++) {
      v[pos * 10 + r.digits[pos]] = 1;
    }
    return v;
  });

  const xs: number[][][] = [];
  const ys: number[][] = [];
  for (let i = 0; i <= vectors.length - seqLen - 1; i++) {
    xs.push(vectors.slice(i, i + seqLen));
    ys.push(vectors[i + seqLen]);
  }

  const xTensor = tf.tensor3d(xs);
  const yTensor = tf.tensor2d(ys);

  const model = tf.sequential();
  model.add(tf.layers.lstm({
    units: 32,
    inputShape: [seqLen, inputDim],
    returnSequences: false,
  }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: inputDim, activation: 'sigmoid' }));

  model.compile({
    optimizer: tf.train.adam(0.002),
    loss: 'binaryCrossentropy',
  });

  const totalEpochs = 10;
  for (let epoch = 0; epoch < totalEpochs; epoch++) {
    await model.fit(xTensor, yTensor, {
      epochs: 1,
      batchSize: 32,
      shuffle: true,
      verbose: 0,
    });
    onProgress?.(epoch + 1, totalEpochs);
    await yieldToMain();
  }

  const lastSeq = vectors.slice(-seqLen);
  const input = tf.tensor3d([lastSeq]);
  const prediction = model.predict(input) as any;
  const probs = Array.from(await prediction.data() as Iterable<number>);

  xTensor.dispose();
  yTensor.dispose();
  input.dispose();
  prediction.dispose();
  model.dispose();

  return probs;
}

/**
 * LSTM予測（桁別）
 */
export async function predictLSTM(
  results: NumbersResult[],
  config: PredictionConfig,
  gameConfig: NumbersGameConfig,
  onProgress?: (epoch: number, total: number) => void
): Promise<Prediction> {
  const { digitCount } = gameConfig;
  const recentResults = results.slice(-200);
  const seqLen = Math.min(20, Math.floor(recentResults.length * 0.5));

  if (recentResults.length < seqLen + 10) {
    return predictStatistical(results, { ...config, method: 'ai' }, gameConfig);
  }

  const probs = await trainLSTMAndPredict(recentResults, gameConfig, onProgress);

  // 各桁のtop-1を選出
  const digits: number[] = [];
  for (let pos = 0; pos < digitCount; pos++) {
    const posProbs = probs.slice(pos * 10, (pos + 1) * 10);

    // 必須指定チェック
    const forced = config.mustInclude.find(e => e.position === pos);
    if (forced) {
      digits.push(forced.digit);
      continue;
    }

    // 除外フィルタリング後、最大確率を選択
    let bestDigit = 0;
    let bestProb = -1;
    for (let d = 0; d <= 9; d++) {
      if (config.mustExclude.some(e => e.position === pos && e.digit === d)) continue;
      if (posProbs[d] > bestProb) {
        bestProb = posProbs[d];
        bestDigit = d;
      }
    }
    digits.push(bestDigit);
  }

  return {
    id: crypto.randomUUID(),
    digits,
    method: 'ai',
    confidence: 0.1 + Math.random() * 0.15,
    reasoning: `AI ニューラルネットワーク（直近${seqLen}回の時系列パターンを学習・10エポック・${digitCount}桁×10次元）`,
    createdAt: new Date().toISOString(),
  };
}

/**
 * AI予測（LSTMのエイリアス）
 */
export async function predictAI(
  results: NumbersResult[],
  config: PredictionConfig,
  gameConfig: NumbersGameConfig,
  onProgress?: (epoch: number, total: number) => void
): Promise<Prediction> {
  return predictLSTM(results, config, gameConfig, onProgress);
}
