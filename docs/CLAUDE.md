# ロト アナライザー (loto-analyzer) — Claude Code 引き継ぎ＆設計仕様書

## プロジェクト概要

日本のロト系宝くじ（ロト6・ロト7・ミニロト）の過去の抽選結果を統計分析し、次回の番号を予測するWebアプリ。
クライアントサイド完結（TensorFlow.js）で、Netlifyにデプロイする想定。

**現在の状態**: ロト6のみ実装済み。ロト7・ミニロトを統合する拡張が必要。

## 技術スタック

- **フロントエンド**: React 19 + TypeScript + Vite 8 + Tailwind CSS 4
- **ML**: TensorFlow.js（LSTM、ブラウザ内学習・推論）
- **チャート**: Recharts 3
- **データ取得**: Netlify Functions（CORS回避用プロキシ）
- **キャッシュ**: localStorage（6時間TTL、ゲーム種別ごとに分離）

---

## Part 1: 現在の実装（ロト6単体）

### ディレクトリ構成

```
loto6-predictor/
├── index.html              # lang="ja", emoji favicon
├── netlify.toml            # ビルド設定・リダイレクト・セキュリティヘッダ
├── package.json
├── vite.config.ts
├── tsconfig.app.json       # verbatimModuleSyntax=false, noUnusedLocals=false
├── netlify/
│   └── functions/
│       └── fetch-results.ts  # CSV取得プロキシ（mk-mode.com + フォールバック）
├── src/
│   ├── main.tsx
│   ├── App.tsx             # ページルーティング（state管理）、ローディング、エラー
│   ├── index.css           # Tailwindインポート、カスタムテーマ（ダークネイビー＋アンバー）
│   ├── lib/
│   │   ├── types.ts        # LotoResult, FrequencyData, PredictionConfig, PageId等
│   │   ├── analysis.ts     # 統計分析（頻度、ギャップ、ペア、合計、奇偶、連番、トレンド）
│   │   ├── prediction.ts   # 3つの予測手法（統計、LSTM、アンサンブル）
│   │   └── sampleData.ts   # Netlify Function不通時のフォールバックデータ
│   ├── hooks/
│   │   └── useLotoData.ts  # データ取得フック（localStorage 6時間キャッシュ）
│   ├── components/
│   │   ├── Header.tsx      # ハンバーガーメニュー（モバイル対応）
│   │   ├── LotoBall.tsx    # 番号ボール（範囲別色分け、レスポンシブサイズ）
│   │   └── Disclaimer.tsx  # 免責事項表示
│   └── pages/
│       ├── DashboardPage.tsx   # 最新結果、頻度チャート、ホット/コールド、カウントダウン
│       ├── AnalysisPage.tsx    # 5タブ分析（頻度、ギャップ、ペア、合計分布、トレンド）
│       ├── PredictionPage.tsx  # 3予測手法、設定カスタマイズ、予測履歴
│       └── HistoryPage.tsx     # ページネーション付き結果テーブル、検索機能
└── dist/                   # ビルド済み（Netlifyドラッグ&ドロップ用）
```

### 解決済みの技術的問題

#### LSTM UIフリーズ対策
- `yieldToMain()` ヘルパーでエポック間にメインスレッドを解放
- モデル軽量化: units 64→32, epochs 30→10, seqLen 30→20
- 学習データを直近200件に制限 (`results.slice(-200)`)

#### TypeScript設定
`tsconfig.app.json` で以下を設定済み（変更しないこと）:
- `verbatimModuleSyntax: false`
- `noUnusedLocals: false`
- `noUnusedParameters: false`

### ハードコードされた定数（要リファクタリング箇所）

以下のファイルに `TOTAL_NUMBERS = 43` と `PICK_COUNT = 6` がハードコードされている:
- `src/lib/analysis.ts` （2行目〜3行目）
- `src/lib/prediction.ts` （4行目〜5行目）

`LotoBall.tsx` のカラーリング（1-9赤、10-19青、20-29緑、30-39橙、40-43紫）もロト6固定。

---

## Part 2: ロト系統合 設計仕様

### 2.1 対象ゲームとパラメータ

| ゲーム | 番号範囲 | 選択数 | ボーナス | 抽選日 | データソース |
|--------|----------|--------|----------|--------|-------------|
| ロト6 | 1〜43 | 6個 | 1個 | 毎週木曜 | mk-mode.com/loto6 |
| ロト7 | 1〜37 | 7個 | 2個 | 毎週金曜 | mk-mode.com/loto7 |
| ミニロト | 1〜31 | 5個 | 1個 | 毎週火曜 | mk-mode.com/miniloto |

### 2.2 GameConfig 型の追加（types.ts）

```typescript
export type GameType = 'loto6' | 'loto7' | 'miniloto';

export interface GameConfig {
  id: GameType;
  name: string;           // 表示名: "ロト6", "ロト7", "ミニロト"
  maxNumber: number;       // 番号範囲の上限: 43, 37, 31
  pickCount: number;       // 選択する番号数: 6, 7, 5
  bonusCount: number;      // ボーナス数の個数: 1, 2, 1
  drawDay: string;         // 抽選曜日: "木曜", "金曜", "火曜"
  drawDayOfWeek: number;   // 0=日〜6=土: 4, 5, 2
  color: string;           // テーマカラー（UIアクセント）
  csvEndpoint: string;     // Netlify Function のエンドポイントパス
}

export const GAME_CONFIGS: Record<GameType, GameConfig> = {
  loto6: {
    id: 'loto6',
    name: 'ロト6',
    maxNumber: 43,
    pickCount: 6,
    bonusCount: 1,
    drawDay: '木曜',
    drawDayOfWeek: 4,
    color: '#F59E0B',  // amber（現在のアクセント色）
    csvEndpoint: '/.netlify/functions/fetch-results?game=loto6',
  },
  loto7: {
    id: 'loto7',
    name: 'ロト7',
    maxNumber: 37,
    pickCount: 7,
    bonusCount: 2,
    drawDay: '金曜',
    drawDayOfWeek: 5,
    color: '#3B82F6',  // blue
    csvEndpoint: '/.netlify/functions/fetch-results?game=loto7',
  },
  miniloto: {
    id: 'miniloto',
    name: 'ミニロト',
    maxNumber: 31,
    pickCount: 5,
    bonusCount: 1,
    drawDay: '火曜',
    drawDayOfWeek: 2,
    color: '#10B981',  // emerald
    csvEndpoint: '/.netlify/functions/fetch-results?game=miniloto',
  },
};
```

### 2.3 LotoResult 型の拡張

```typescript
export interface LotoResult {
  round: number;
  date: string;
  numbers: number[];
  bonus: number | number[];  // ロト7はボーナス2個 → number[]
  firstPrize: number;
  firstWinners: number;
  carryover: number;
  totalSales: number;
}
```

### 2.4 リファクタリング方針（ファイル別）

#### src/lib/analysis.ts
- `TOTAL_NUMBERS` と `PICK_COUNT` を全関数の引数 `config: GameConfig` から取得するように変更
- 関数シグネチャ例: `calcFrequency(results, config, lastN?)`
- calcOddEven の `PICK_COUNT` 参照も `config.pickCount` に
- 全7関数（calcFrequency, calcGaps, calcPairs, calcSumStats, calcOddEven, calcConsecutive, calcTrend）に config を渡す

#### src/lib/prediction.ts
- `TOTAL_NUMBERS` と `PICK_COUNT` を `config: GameConfig` から取得
- `predictStatistical(results, config)` — config.maxNumber, config.pickCount を使用
- `trainLSTMAndPredict(results, config, onProgress)` — LSTM入力次元を config.maxNumber に
- `predictLSTM(results, config, onProgress)` — 同上
- `predictEnsemble(results, config, onProgress)` — 同上

#### src/lib/sampleData.ts
- `generateSampleData(config: GameConfig)` に変更
- config.maxNumber と config.pickCount でサンプル生成

#### src/hooks/useLotoData.ts
- `useLotoData(gameType: GameType)` に変更
- キャッシュキーをゲーム別に分離: `loto6_data`, `loto7_data`, `miniloto_data`
- フェッチURLを `config.csvEndpoint` から取得

#### src/components/LotoBall.tsx
- カラーリングをゲームの maxNumber に応じて動的に計算
- 色帯の分割: `Math.ceil(config.maxNumber / 5)` 個ごとに色を切り替え

#### src/components/Header.tsx
- ゲーム切り替えタブ（またはセレクタ）をヘッダーに追加
- 現在選択中のゲーム名を表示
- 各ゲームのテーマカラーをアクセントに反映

#### src/App.tsx
- `gameType` state を追加: `useState<GameType>('loto6')`
- `useLotoData(gameType)` にゲーム種別を渡す
- 全ページコンポーネントに `config: GameConfig` を props で渡す
- ゲーム切り替え時にデータを再取得

#### src/pages/*.tsx（全4ページ）
- props に `config: GameConfig` を追加
- 表示テキスト中の "ロト6" を `config.name` に
- カウントダウンの曜日を `config.drawDayOfWeek` から計算
- 番号範囲を `config.maxNumber` に

#### netlify/functions/fetch-results.ts
- クエリパラメータ `?game=loto6|loto7|miniloto` で分岐
- ゲーム別のCSVソースとパーサー:

```typescript
const GAME_SOURCES: Record<string, { url: string; parse: Function; pickCount: number }[]> = {
  loto6: [
    { url: 'https://www.mk-mode.com/rails/loto/loto6/csv', parse: parseMkMode, pickCount: 6 },
  ],
  loto7: [
    { url: 'https://www.mk-mode.com/rails/loto/loto7/csv', parse: parseLoto7, pickCount: 7 },
  ],
  miniloto: [
    { url: 'https://www.mk-mode.com/rails/loto/mini_loto/csv', parse: parseMiniLoto, pickCount: 5 },
  ],
};
```

- ロト7のパーサー: 本数字7個 + ボーナス2個の列構成に対応
- ミニロト: 本数字5個 + ボーナス1個

### 2.5 UI変更

#### ゲーム切り替えUI
ヘッダー直下にタブバーを追加:
```
[🎯 ロト6] [🍀 ロト7] [✨ ミニロト]
```
- 選択中のゲームはアンダーラインとテーマカラーで強調
- モバイルではコンパクトなピル型ボタン
- 切り替え時にスムーズなトランジション（データ読み込み中はスピナー）

#### テーマカラーの動的切り替え
- CSS変数 `--color-accent` をゲームごとに切り替え
- ロト6: アンバー, ロト7: ブルー, ミニロト: エメラルド

#### ダッシュボードの抽選日カウントダウン
- `config.drawDayOfWeek` を使って次回抽選日を計算

### 2.6 拡張後のディレクトリ構成

```
loto-analyzer/                  # ← リネーム推奨
├── index.html
├── netlify.toml
├── package.json
├── vite.config.ts
├── tsconfig.app.json
├── netlify/
│   └── functions/
│       └── fetch-results.ts    # ゲーム別分岐対応
├── src/
│   ├── main.tsx
│   ├── App.tsx                 # gameType state追加
│   ├── index.css               # CSS変数でテーマカラー動的切替
│   ├── lib/
│   │   ├── types.ts            # GameType, GameConfig, GAME_CONFIGS 追加
│   │   ├── analysis.ts         # 全関数にconfig引数追加
│   │   ├── prediction.ts       # 全関数にconfig引数追加
│   │   └── sampleData.ts       # config対応
│   ├── hooks/
│   │   └── useLotoData.ts      # gameType引数対応、キャッシュ分離
│   ├── components/
│   │   ├── Header.tsx           # ゲーム切り替えタブ追加
│   │   ├── GameSelector.tsx     # 【新規】ゲーム選択タブコンポーネント
│   │   ├── LotoBall.tsx         # 動的カラーリング
│   │   └── Disclaimer.tsx
│   └── pages/
│       ├── DashboardPage.tsx    # config props対応
│       ├── AnalysisPage.tsx     # config props対応
│       ├── PredictionPage.tsx   # config props対応
│       └── HistoryPage.tsx      # config props対応
└── dist/
```

### 2.7 実装の優先順序

Claude Codeで以下の順序で実装すること:

1. **types.ts**: `GameType`, `GameConfig`, `GAME_CONFIGS` を追加、`LotoResult.bonus` を `number | number[]` に
2. **analysis.ts**: 全関数に `config: GameConfig` 引数を追加、ハードコード定数を除去
3. **prediction.ts**: 同上。LSTM入力次元を `config.maxNumber` に
4. **sampleData.ts**: `generateSampleData(config)` に変更
5. **fetch-results.ts**: ゲーム別分岐、ロト7・ミニロトのパーサー追加
6. **useLotoData.ts**: `gameType` 引数対応、キャッシュキー分離
7. **App.tsx**: `gameType` state 追加、config を全ページに渡す
8. **GameSelector.tsx**: 新規作成（ゲーム切り替えタブ）
9. **Header.tsx**: GameSelector を組み込み
10. **LotoBall.tsx**: 動的カラーリング対応
11. **各ページ**: config props 対応（表示テキスト、カウントダウン等）
12. **index.css**: CSS変数によるテーマカラー動的切替
13. **ビルド確認**: `npm run build` が通ることを確認
14. **プロジェクト名変更**: `loto-analyzer` にリネーム（package.json, index.html等）

---

## Part 3: 残タスク（Claude Codeで実行すること）

### Phase 1: ロト系統合（上記 2.7 の手順）
上記の設計仕様に従い、ロト6単体アプリをロト6・ロト7・ミニロトの3ゲーム対応に拡張する。

### Phase 2: GitHubリポジトリ作成 & Push
```bash
cd loto-analyzer
git init
git add .
git commit -m "feat: ロト系アナライザー（ロト6・ロト7・ミニロト統合）"
gh repo create loto-analyzer --public --source=. --push
```

### Phase 3: Netlifyデプロイ
```bash
npm install -g netlify-cli
netlify login
netlify init
# ビルドコマンド: npm run build
# 公開ディレクトリ: dist
# Netlify Functionsディレクトリ: netlify/functions
```

### Phase 4: 動作確認
- `npm run build` が正常に完了すること
- 3ゲームすべてのデータ取得が動作すること
- ゲーム切り替えがスムーズに動作すること
- LSTM予測が各ゲームで30秒程度で完了すること（UIフリーズなし）
- モバイルレスポンシブが維持されていること

---

## ビルド & 実行

```bash
npm install
npm run dev      # 開発サーバー (localhost:5173)
npm run build    # 本番ビルド → dist/
npm run preview  # ビルド確認
```

## 注意事項

- `tsconfig.app.json` の設定（verbatimModuleSyntax等）は変更しないこと
- TensorFlow.js のUIフリーズ対策（yieldToMain、エポック間yield）は必ず維持すること
- `dist/` フォルダは既にビルド済み（ロト6のみ）。統合後に再ビルドが必要
- Netlify Functionsは `netlify/functions/` に配置。`netlify dev` でローカルテスト可能
