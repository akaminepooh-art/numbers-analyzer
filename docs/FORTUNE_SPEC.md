# 占い機能 設計仕様書 — loto-analyzer 拡張

## 概要

loto-analyzer に数秘術ベースの占い機能を追加し、ユーザー固有の「ラッキーナンバー」と「購入おすすめ日」を提供する。統計予測・LSTM予測に続く第3の軸として、エンタメ性とアプリの再訪率を高める。

### 設計思想
- **占い感重視**: 数字系統にストーリー性を持たせ、「あなたは○系統」という世界観を作る
- **日替わり要素**: 毎日変わるラッキーナンバーと購入運で、毎日開く動機を作る
- **既存機能との連携**: 占いで出たコア番号を、統計/LSTM予測に「含めるべき番号」として連携

---

## 1. 数秘術ロジック

### 1.1 基本計算: デジタルルート

全ての数秘術計算の基盤。各桁を足して1桁になるまで繰り返す。
ただし **11, 22, 33** はマスターナンバーとして特別扱い（2桁のまま保持）。

```typescript
function digitalRoot(n: number): number {
  // マスターナンバーチェック
  if (n === 11 || n === 22 || n === 33) return n;
  while (n >= 10) {
    n = String(n).split('').reduce((sum, d) => sum + parseInt(d), 0);
    if (n === 11 || n === 22 || n === 33) return n;
  }
  return n;
}
```

### 1.2 ライフパス数（固定 — ユーザーの核）

生年月日の全桁を合計してデジタルルート化。

```
例: 1990年5月15日
→ 1+9+9+0 = 19 → 1+9 = 10 → 1+0 = 1
→ 5
→ 1+5 = 6
→ 1 + 5 + 6 = 12 → 1+2 = 3
→ ライフパス数: 3
```

**算出方法**: 年・月・日をそれぞれ個別にデジタルルートしてから合算し、再度デジタルルート。

```typescript
function calcLifePath(year: number, month: number, day: number): number {
  const y = digitalRoot(year);
  const m = digitalRoot(month);
  const d = digitalRoot(day);
  return digitalRoot(y + m + d);
}
```

### 1.3 誕生数（固定）

生まれた日のデジタルルート。
```
15日生まれ → 1+5 = 6
```

### 1.4 個人年数（年ごとに変わる）

```
生まれ月 + 生まれ日 + 今年の西暦 → デジタルルート
例: 5月15日 + 2026年 → 5 + 6 + 10 → 21 → 3
```

### 1.5 個人月数（月ごとに変わる）

```
個人年数 + 今月 → デジタルルート
```

### 1.6 個人日数（日ごとに変わる）

```
個人月数 + 今日の日付 → デジタルルート
```

---

## 2. 数字系統プロフィール

ライフパス数ごとに固有のプロフィールを持たせる。

### 2.1 系統定義

```typescript
export interface NumerologyProfile {
  number: number;           // ライフパス数 (1-9, 11, 22, 33)
  name: string;             // 系統名
  title: string;            // キャッチフレーズ
  description: string;      // 性格・運勢の説明文
  element: string;          // 属性（火・水・風・地・光）
  luckyAffinity: string;    // 番号との相性の説明
  coreNumbers: number[];    // コアラッキーナンバー（1〜9の範囲）
  color: string;            // テーマカラー
  emoji: string;            // アイコン絵文字
}
```

### 2.2 全系統一覧

| 数 | 系統名 | キャッチフレーズ | 属性 | 相性の良い番号の傾向 |
|----|--------|-----------------|------|---------------------|
| 1 | 先駆者 | 「始まりの数字に導かれる者」 | 火 | 1の位が1,0の番号、先頭寄りの数字 |
| 2 | 調和者 | 「対の数字が幸運を呼ぶ者」 | 水 | 偶数、ペアになりやすい番号 |
| 3 | 創造者 | 「三位一体の力を持つ者」 | 風 | 3の倍数、中央値付近の番号 |
| 4 | 建設者 | 「堅実な数字が味方する者」 | 地 | 4の倍数、安定した中間帯 |
| 5 | 冒険者 | 「変化の波に乗る者」 | 風 | 素数、散らばった番号 |
| 6 | 守護者 | 「調和の数字に愛される者」 | 水 | 6の倍数、バランスの取れた組合せ |
| 7 | 探究者 | 「神秘の数字と共鳴する者」 | 光 | 素数、7の倍数 |
| 8 | 支配者 | 「大きな数字を引き寄せる者」 | 地 | 8の倍数、上位帯の番号 |
| 9 | 完成者 | 「全てを包む数字の達人」 | 火 | 9の倍数、幅広い範囲 |
| 11 | 直感者 | 「見えない流れを読む者」 | 光 | 11の倍数、ゾロ目系 |
| 22 | 大建築者 | 「大きな運命を動かす者」 | 地 | 22の倍数、上位大物番号 |
| 33 | 大奉仕者 | 「全ての数字に愛される者」 | 光 | 全範囲から満遍なく |

---

## 3. ラッキーナンバー生成

### 3.1 コア番号の生成（2〜3個）

ユーザー固有の「占いがおすすめする番号」。ゲームの番号範囲（ロト6なら1〜43）に合わせて生成。

```typescript
function generateLuckyNumbers(
  birthDate: { year: number; month: number; day: number },
  today: Date,
  gameConfig: GameConfig
): LuckyNumberResult {
  const lifePath = calcLifePath(birthDate.year, birthDate.month, birthDate.day);
  const birthNum = digitalRoot(birthDate.day);
  const personalDay = calcPersonalDay(birthDate, today);

  // コア番号1: ライフパス数ベース（固定）
  // ライフパス数 × 黄金比を番号範囲に収める
  const core1 = ((lifePath * 7) % gameConfig.maxNumber) + 1;

  // コア番号2: 誕生数 × 個人日数（日替わり）
  const core2 = ((birthNum * personalDay * 3) % gameConfig.maxNumber) + 1;

  // コア番号3: 個人日数ベース（日替わり）
  const dayHash = (personalDay * 13 + birthDate.day * 7 + today.getDate()) % gameConfig.maxNumber + 1;
  const core3 = dayHash;

  // 重複排除して返す
  const numbers = [...new Set([core1, core2, core3])];
  return { numbers, lifePath, personalDay };
}
```

### 3.2 番号の性質説明

各コア番号に対して「なぜこの番号が出たか」のストーリーを生成:

```
「あなたのライフパス数7が導く番号です」
「今日の個人日数5と誕生数6の共鳴で浮かび上がった番号です」
「あなたの探究者タイプが今日特に引き寄せている番号です」
```

---

## 4. 購入おすすめ日

### 4.1 日運スコアの算出

個人日数と六曜の2軸で、毎日の購入運を5段階（★1〜★5）で判定。

```typescript
interface DailyFortune {
  date: Date;
  score: number;          // 1〜5
  personalDay: number;    // 個人日数
  rokuyo: string;         // 六曜名
  label: string;          // "最高の購入日" / "おすすめ" / "普通" / "控えめに" / "見送り推奨"
  message: string;        // ストーリー性のあるメッセージ
  luckyNumbers: number[]; // その日のラッキーナンバー
}
```

### 4.2 スコア判定ロジック

```
■ 個人日数スコア（0〜3点）
  - 個人日数 = ライフパス数 → 3点（完全共鳴）
  - 個人日数 = 誕生数     → 2点（強い共鳴）
  - 個人日数が同じ属性    → 1点（属性一致）
  - その他               → 0点

■ 六曜スコア（0〜2点）
  - 大安 → 2点
  - 友引 → 1点
  - 先勝（午前）→ 1点
  - 先負（午後）→ 1点
  - 赤口 → 0点
  - 仏滅 → 0点

■ 合計 → 5段階にマッピング
  - 5点: ★★★★★「最高の購入日 — 数字の神様があなたを呼んでいます」
  - 4点: ★★★★☆「強くおすすめ — 今日の流れに乗りましょう」
  - 3点: ★★★☆☆「良い日 — 直感を信じて」
  - 2点: ★★☆☆☆「控えめに — 少額で楽しむ日」
  - 0〜1点: ★☆☆☆☆「見送り推奨 — 次の好機を待ちましょう」
```

### 4.3 六曜計算

六曜は旧暦の月日から算出する。簡易計算:

```typescript
// 新暦→旧暦の変換テーブル（またはライブラリ）が必要
// 六曜 = (旧暦月 + 旧暦日) % 6
// 0:大安, 1:赤口, 2:先勝, 3:友引, 4:先負, 5:仏滅

// 実装案: 軽量な旧暦変換ライブラリを使用
// npm: japanese-calendar または自前の簡易テーブル（2020〜2030年分）
```

**実装の選択肢**:
- **ライブラリ使用**: `japanese-holidays` 等 → 正確だがバンドルサイズ増
- **テーブル方式**: 2024〜2030年分の六曜をJSONで持つ → 軽量だが期限あり
- **簡易計算**: ツェラーの公式ベースの近似 → 軽量だが一部不正確

**推奨**: テーブル方式（JSONで年間データを持つ。数KBで済む）

---

## 5. 購入カレンダー

### 5.1 仕様

向こう4週間分の抽選日に対して、日運スコアをカレンダー表示。

```
  3月                     ロト6(木) ロト7(金) ミニロト(火)
  ───────────────────────────────────────────────
  第4週  3/24(火) ─────────────── ─────────── ★★★★☆
         3/26(木) ★★★★★ ─────────── ───────────
         3/27(金) ─────────── ★★★☆☆ ───────────
  第5週  3/31(火) ─────────────── ─────────── ★★☆☆☆
  ...
```

### 5.2 表示要素

- 日付
- 対応ゲーム名
- 星スコア（★表示）
- 一言メッセージ（「最高の購入日！」等）
- タップで詳細表示（その日のラッキーナンバー、スコア内訳）

---

## 6. UI設計

### 6.1 新規ページ: 占いページ

`PageId` に `'fortune'` を追加。ヘッダーナビに「占い」メニューを追加。

```typescript
export type PageId = 'dashboard' | 'analysis' | 'prediction' | 'history' | 'fortune';
```

#### 占いページの構成

```
┌────────────────────────────────────┐
│ 🔮 あなたの数秘プロフィール         │
│                                    │
│  生年月日: [    年][  月][  日]     │
│  ※ localStorageに保存（再入力不要）  │
│                                    │
├────────────────────────────────────┤
│ 🌟 あなたは「7 — 探究者」タイプ     │
│ 「神秘の数字と共鳴する者」           │
│                                    │
│ 属性: 光 ✨                         │
│ 素数や7の倍数との相性が抜群です。    │
│ 直感を大切にすると良い結果が...      │
│                                    │
├────────────────────────────────────┤
│ 🎯 今日のラッキーナンバー            │
│                                    │
│  [7] [21] [35]                     │
│  「ライフパス数7が導く番号です」     │
│                                    │
│  [予測に組み込む] ボタン             │
│                                    │
├────────────────────────────────────┤
│ 📅 購入おすすめカレンダー            │
│                                    │
│  ▶ 今日 3/21(金) — ロト7抽選日      │
│    ★★★★☆ 「強くおすすめ！」        │
│                                    │
│  ▶ 3/25(火) — ミニロト              │
│    ★★★☆☆ 「直感を信じて」          │
│                                    │
│  ▶ 3/27(木) — ロト6                 │
│    ★★★★★ 「最高の購入日！」        │
│  ...（4週間分）                     │
└────────────────────────────────────┘
```

### 6.2 ダッシュボードへの組み込み

ダッシュボードにも「今日の運勢」カードを追加:

```
┌──────────────────────┐
│ 🔮 今日の購入運       │
│ ★★★★☆              │
│ 「強くおすすめ！」    │
│ ラッキー: [7] [21]   │
│ [占い詳細へ →]       │
└──────────────────────┘
```

### 6.3 予測ページとの連携

予測設定（PredictionConfig）の「必ず含める番号」に、占いのラッキーナンバーをワンタップで追加できるボタンを設置。

```
占いおすすめ: [7] [21] [35]  [+ 予測に含める]
```

---

## 7. データモデル

### 7.1 新規型定義（types.ts に追加）

```typescript
// 生年月日
export interface BirthDate {
  year: number;
  month: number;
  day: number;
}

// 数秘術プロフィール
export interface NumerologyProfile {
  lifePath: number;
  birthNumber: number;
  personalYear: number;
  personalMonth: number;
  personalDay: number;
  systemName: string;       // "探究者"
  systemTitle: string;      // "神秘の数字と共鳴する者"
  element: string;          // "光"
  description: string;
  color: string;
  emoji: string;
}

// 日運
export interface DailyFortune {
  date: string;             // ISO date
  score: number;            // 1-5
  rokuyo: string;           // 六曜
  label: string;            // "最高の購入日"
  message: string;          // ストーリーメッセージ
  luckyNumbers: number[];
  gameType?: GameType;      // 対応するゲーム（抽選日の場合）
}

// ラッキーナンバー結果
export interface LuckyNumberResult {
  numbers: number[];
  reasoning: string[];      // 各番号の理由
  profile: NumerologyProfile;
}
```

### 7.2 localStorage 保存

```typescript
// キー: 'fortune_birthdate'
// 値: BirthDate (JSON)
// 一度入力すれば再入力不要
```

---

## 8. ファイル構成（新規・変更）

```
src/
├── lib/
│   ├── fortune.ts          # 【新規】数秘術計算、ラッキーナンバー生成
│   ├── rokuyo.ts           # 【新規】六曜計算 or テーブルデータ
│   ├── numerology-data.ts  # 【新規】系統プロフィールの定義データ
│   └── types.ts            # BirthDate, NumerologyProfile, DailyFortune 追加
├── pages/
│   └── FortunePage.tsx     # 【新規】占いページ
├── components/
│   ├── FortuneCard.tsx     # 【新規】ダッシュボード用の運勢カード
│   ├── BirthDateInput.tsx  # 【新規】生年月日入力コンポーネント
│   ├── NumerologyBadge.tsx # 【新規】系統バッジ表示
│   └── FortuneCalendar.tsx # 【新規】購入おすすめカレンダー
└── App.tsx                 # fortune ページルーティング追加
```

---

## 9. 実装の優先順序

1. **fortune.ts**: 数秘術の全計算ロジック（digitalRoot, calcLifePath, calcPersonalDay, generateLuckyNumbers）
2. **rokuyo.ts**: 六曜データテーブル（2024〜2030年分のJSON）
3. **numerology-data.ts**: 12系統のプロフィール定義
4. **types.ts**: BirthDate, NumerologyProfile, DailyFortune 型を追加
5. **BirthDateInput.tsx**: 生年月日入力UI + localStorage保存
6. **FortunePage.tsx**: 占いメインページ（プロフィール表示、ラッキーナンバー、カレンダー）
7. **FortuneCard.tsx**: ダッシュボード用の「今日の運勢」カード
8. **FortuneCalendar.tsx**: 4週間分の購入おすすめカレンダー
9. **DashboardPage.tsx**: FortuneCard を組み込み
10. **PredictionPage.tsx**: 「占いの番号を予測に含める」ボタン追加
11. **Header.tsx / App.tsx**: 占いページのナビゲーション追加
12. **ビルド確認**: `npm run build` が通ることを確認

---

## 10. 注意事項

- 六曜データはテーブル方式を推奨（バンドルサイズ最小化）。ライブラリが軽量なら検討可
- 生年月日はlocalStorageに保存し、再訪時の入力を省略する
- 占いのラッキーナンバーはゲームの番号範囲（maxNumber）に動的に対応すること
- マスターナンバー（11, 22, 33）は特別感のある表示にする
- 占い結果は「エンタメです」の免責表示を忘れずに
- TensorFlow.jsの学習とは独立したロジックなので、占い機能の追加でLSTMの動作に影響は出ない
