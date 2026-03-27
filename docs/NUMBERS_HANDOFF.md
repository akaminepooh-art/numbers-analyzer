# ナンバーズ アナライザー — 引き継ぎ資料

## 概要

ロトアナライザー（loto-analyzer）のリポジトリをベースに、ナンバーズ3・ナンバーズ4の予測・分析Webアプリを開発する。
ロトアナライザーで確立したアーキテクチャ・UIパターン・運用基盤をそのまま活用し、ナンバーズ特有のゲーム性に適応させる。

---

## 1. ベースプロジェクト（ロトアナライザー）の構成

### 1.1 技術スタック

| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 19 | UI |
| TypeScript | 5.9 | 型安全 |
| Vite | 8 | ビルド |
| Tailwind CSS | 4 | スタイリング |
| TensorFlow.js | 4.22 | LSTM予測（ブラウザ内） |
| Recharts | 3 | データ可視化 |
| lucide-react | 0.577 | アイコン |
| qrcode.react | 4.2 | QRコード生成 |
| react-router-dom | 7.13 | （インストール済みだがstate管理でルーティング） |
| @netlify/functions | 5.1 | CORSプロキシ |
| papaparse | 5.5 | CSVパース（参考用、現在はカスタムパーサー使用） |

### 1.2 ディレクトリ構成

```
loto6-predictor/
├── index.html                          # エントリHTML（AdSenseスクリプト、OGPメタタグ）
├── netlify.toml                        # Netlifyビルド・リダイレクト・ヘッダ設定
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js
│
├── netlify/functions/
│   └── fetch-results.ts                # Netlify Function: CSV取得CORS プロキシ
│
├── public/
│   ├── favicon.svg
│   ├── ads.txt                         # AdSense認証ファイル
│   ├── robots.txt                      # SEO: クローラー制御
│   ├── sitemap.xml                     # SEO: サイトマップ
│   ├── google68dee907b223b31d.html     # Search Console所有権確認
│   └── images/
│       ├── bg-main.webp                # メイン背景（全ページフォールバック）
│       ├── bg-fortune.webp             # 占いページ専用背景
│       ├── bg-prediction.webp          # 予測ページ専用背景
│       ├── hero-ball.png               # ダッシュボード装飾（透過PNG）
│       ├── lucky-cat.png               # 占いページ装飾（透過PNG）
│       └── *.webp                      # 対応するwebp版（バックアップ）
│
├── src/
│   ├── main.tsx                        # エントリポイント
│   ├── App.tsx                         # メインアプリ（ルーティング、テーマ、スワイプ）
│   ├── index.css                       # Tailwindインポート + カスタムテーマ + アニメーション
│   │
│   ├── lib/
│   │   ├── types.ts                    # 全型定義 + GameConfig + GAME_CONFIGS定数
│   │   ├── analysis.ts                 # 統計分析関数（8関数、全てconfig引数）
│   │   ├── prediction.ts               # 予測エンジン（統計・LSTM・アンサンブル）
│   │   ├── fortune.ts                  # 数秘術ロジック（ラッキーナンバー、日運、カレンダー）
│   │   ├── numerology-data.ts          # 数秘術プロフィールデータ（1-33のマスターナンバー）
│   │   ├── rokuyo.ts                   # 六曜算出（大安・仏滅等）
│   │   ├── kichijitsu.ts              # 吉日判定（一粒万倍日等）
│   │   └── sampleData.ts              # フォールバック用サンプルデータ生成
│   │
│   ├── hooks/
│   │   └── useLotoData.ts             # データ取得Hook（localStorage 6h キャッシュ）
│   │
│   ├── components/
│   │   ├── Header.tsx                  # ヘッダー（ゲームセレクター、テーマ切替、QR）
│   │   ├── GameSelector.tsx            # ゲーム切り替えタブ
│   │   ├── LotoBall.tsx               # 番号ボール（動的カラーリング）
│   │   ├── GlassCard.tsx              # グラスモーフィズムカード
│   │   ├── FortuneCard.tsx            # 占い結果カード
│   │   ├── FortuneCalendar.tsx        # 購入おすすめカレンダー
│   │   ├── BirthDateInput.tsx         # 生年月日入力（年・月・日セレクトボックス）
│   │   ├── AdSlot.tsx                 # 広告枠コンポーネント（フラグで有効化）
│   │   ├── ShareQR.tsx                # QRコード共有モーダル
│   │   ├── CookieConsent.tsx          # Cookie同意バナー
│   │   └── Disclaimer.tsx             # 免責事項
│   │
│   └── pages/
│       ├── DashboardPage.tsx           # ダッシュボード（最新結果、統計サマリー）
│       ├── AnalysisPage.tsx            # 統計分析（5タブ: 頻度、ギャップ、ペア、合計、トレンド）
│       ├── PredictionPage.tsx          # 予測（統計・AI・運勢の3柱）
│       ├── FortunePage.tsx             # 占い（数秘術プロフィール、カレンダー）
│       ├── HistoryPage.tsx             # 抽選履歴（検索、ページネーション）
│       └── LegalPage.tsx              # プライバシーポリシー・利用規約・免責
```

### 1.3 核心アーキテクチャ: GameConfig パターン

ロトアナライザーの最重要設計パターン。**全ての機能がGameConfigを通じてゲーム種別を抽象化**している。

```typescript
// types.ts
export type GameType = 'loto6' | 'loto7' | 'miniloto';

export interface GameConfig {
  id: GameType;
  name: string;           // 表示名
  maxNumber: number;       // 番号範囲上限
  pickCount: number;       // 選択数
  bonusCount: number;      // ボーナス数
  drawDay: string;         // "木曜" 等
  drawDayOfWeek: number;   // 0=日〜6=土
  color: string;           // テーマカラー
  colorLight: string;      // テーマカラー（明）
  csvUrl: string;          // データソースURL
  emoji: string;           // 表示用絵文字
}
```

**ナンバーズでの適用**: このパターンをそのまま `NumbersGameConfig` として拡張する。

### 1.4 Netlify Function: CSVデータ取得プロキシ

`netlify/functions/fetch-results.ts` の仕組み:

1. クライアントが `/.netlify/functions/fetch-results?game=loto6` にリクエスト
2. Netlify Function が `https://loto6.thekyo.jp/data/loto6.csv` を取得
3. **Shift-JIS → UTF-8 デコード**: `new TextDecoder('shift-jis').decode(buf)`
4. CSVをパースしてJSONに変換
5. クライアントに返却

**重要**: thekyo.jp のCSVは Shift-JIS エンコード。`TextDecoder('shift-jis')` が必須。

### 1.5 データキャッシュ戦略

```
useLotoData(gameType) Hook:
  1. localStorage に ${gameType}_data キーでキャッシュ確認
  2. キャッシュが6時間以内 → キャッシュから復元（source: "キャッシュ"）
  3. 期限切れ or 未取得 → Netlify Function にfetch → localStorage保存（source: "thekyo.jp"）
  4. fetch失敗 → サンプルデータにフォールバック（source: "サンプルデータ"）
```

### 1.6 予測エンジン（3柱構成）

| 柱 | メソッド名 | 説明 |
|----|-----------|------|
| 統計予測 | `predictStatistical()` | 出現頻度・ギャップ・ペア・トレンドを重み付けスコアリング |
| AI予測 | `predictLSTM()` | TensorFlow.js LSTM。入力次元=maxNumber、直近200件で学習 |
| 運勢予測 | fortune.ts | 数秘術ベース。生年月日からラッキーナンバー生成 |

**LSTM注意点**:
- `yieldToMain()` でエポック間にUIスレッドを解放（フリーズ防止）
- units=32, epochs=10, seqLen=20 に軽量化済み
- 学習データは直近200件に制限

### 1.7 UI/UXパターン

- **テーマ**: ダーク（デフォルト）/ ライト切り替え
- **グラスモーフィズム**: `.glass`, `.glass-glow`, `.glass-highlight` クラス
- **ゴールドアクセント**: 金運感を演出する配色
- **背景画像**: AI生成のページ固有背景（webp）
- **装飾画像**: hero-ball.png, lucky-cat.png（透過PNG、最前面レイヤー）
- **ボトムナビ**: フッター固定5タブ（ホーム、分析、予測、占い、履歴）
- **スワイプ**: 横スワイプでゲーム種別切り替え
- **アニメーション**: bounce-in, slide-up, fade-in, gold-shimmer, particle-drift
- **レスポンシブ**: モバイルファースト設計

### 1.8 運用基盤

| 基盤 | 状態 |
|------|------|
| Netlifyデプロイ | 済（loto-analyzer.netlify.app） |
| Google AdSense | 申請済み・審査中（広告枠はフラグで制御） |
| Google Search Console | 登録済み・サイトマップ送信済み |
| ads.txt | 配置済み |
| プライバシーポリシー | LegalPage に実装済み |
| Cookie同意バナー | CookieConsent コンポーネント |
| OGPメタタグ | index.html に設定済み |
| QRコード共有 | ShareQR コンポーネント |

---

## 2. ナンバーズへの適応方針

### 2.1 対象ゲーム

| ゲーム | 番号構成 | 抽選日 | 申込タイプ |
|--------|---------|--------|-----------|
| ナンバーズ3 | 0〜9 から3桁（000〜999） | 毎週月〜金 | ストレート、ボックス、セット、ミニ |
| ナンバーズ4 | 0〜9 から4桁（0000〜9999） | 毎週月〜金 | ストレート、ボックス、セット |

### 2.2 ロトとの根本的な違い

ナンバーズは**組合せ選択**ではなく**桁ごとの数字選択**。

| 項目 | ロト | ナンバーズ |
|------|------|----------|
| 番号の性質 | 1〜N から K個選択（組合せ） | 各桁が独立した0〜9 |
| 番号範囲 | 31〜43 | 0〜9（固定） |
| 順序 | 無関係（ソート済み） | 重要（ストレート） |
| ボーナス番号 | あり | なし |
| 申込タイプ | 1種類 | 複数（ストレート/ボックス等） |
| 同じ数字 | 不可（重複なし） | 可（ゾロ目あり: 777等） |

### 2.3 GameConfig の適応案

```typescript
export type NumbersGameType = 'numbers3' | 'numbers4';

export interface NumbersGameConfig {
  id: NumbersGameType;
  name: string;           // "ナンバーズ3", "ナンバーズ4"
  digitCount: number;      // 3 or 4（ロトの pickCount に相当）
  maxDigit: number;        // 9（固定）
  drawDays: number[];      // [1,2,3,4,5]（月〜金）
  color: string;
  colorLight: string;
  csvUrl: string;          // データソースURL
  emoji: string;
  betTypes: BetType[];     // 申込タイプ一覧
}

export type BetType = 'straight' | 'box' | 'set' | 'mini';

export interface NumbersResult {
  round: number;
  date: string;
  digits: number[];        // [3, 7, 2] or [1, 5, 8, 3]
  straightPrize: number;
  boxPrize: number;
  setPrize: number;
  miniPrize?: number;      // ナンバーズ3のみ
}
```

### 2.4 分析ロジックの変更

ロトの分析関数はそのまま使えないものが多い。桁ベースの分析に書き換え:

| ロト分析 | ナンバーズ対応 |
|---------|-------------|
| 出現頻度（1〜43） | **桁別出現頻度**（各桁の0〜9出現率） |
| ギャップ分析 | **桁別ギャップ**（各桁で特定数字が何回前に出たか） |
| ペア分析 | **桁間相関**（1桁目が3の時、2桁目は何が多いか） |
| 合計分布 | **3桁/4桁合計分布**（合計値のヒストグラム） |
| 奇偶分析 | **奇偶パターン**（奇奇偶、偶奇奇 等） |
| 連番分析 | **連続数字パターン**（123, 234等の出現率） |
| トレンド | **桁別トレンド**（直近N回での各桁の数字推移） |

**新規分析**:
- **ゾロ目分析**: 同一数字の出現パターン（777, 1111等）
- **申込タイプ別期待値**: ストレート vs ボックス vs セットの期待値比較
- **ボックス変換**: ストレート番号のボックスでの組み合わせ数

### 2.5 LSTM予測の適応

ロト: 入力=maxNumber次元のバイナリベクトル → 出力=maxNumber次元の確率

ナンバーズ:
```
入力: 各桁×10の確率 = digitCount × 10 次元
  例: ナンバーズ3 → 30次元ベクトル
      [桁1の0確率, 桁1の1確率, ..., 桁1の9確率, 桁2の0確率, ...]

出力: 同じ30次元 → 各桁のtop-1を選出
```

### 2.6 占い（数秘術）の適応

数秘術ロジック（fortune.ts）は**ほぼそのまま使える**。
変更点:
- ラッキーナンバーの生成範囲を 0〜9 に（`% 10` ベース）
- 3桁/4桁の組み合わせとして出力
- 理由文のゲーム名を「ナンバーズ3」「ナンバーズ4」に

### 2.7 データソース

ナンバーズのCSVデータソース候補:
- `https://num3.thekyo.jp/data/num3.csv` ← **ロトと同じthekyo.jp系列を最初に確認**
- `https://num4.thekyo.jp/data/num4.csv`
- 上記が存在しない場合は別ソースを探索

**注意**: データソースの確認が最初のタスク。thekyo.jp がナンバーズに対応しているか要調査。

### 2.8 UIの変更点

- **NumbersBall**: ロトボール（丸）ではなく、**デジタル表示**（7セグ風や四角枠）が適切
- **桁表示**: `[3] [7] [2]` のような桁区切り表示
- **申込タイプ表示**: ストレート/ボックス/セットの切り替えUI
- **ゲームセレクター**: ナンバーズ3 / ナンバーズ4 の2タブ
- **カラーテーマ**: ロトとは異なる配色（例: レッド系、パープル系）
- **背景画像**: ナンバーズ用に新規生成が必要

---

## 3. リポジトリコピー手順

```bash
# 1. リポジトリをコピー
cp -r D:/loto-analyzer/loto6-handoff-v2/loto6-predictor D:/numbers-analyzer

# 2. 不要ファイル削除
cd D:/numbers-analyzer
rm -rf node_modules dist .git .netlify

# 3. 初期化
git init
npm install

# 4. package.json の name を変更
# "loto-analyzer" → "numbers-analyzer"

# 5. 開発開始
npm run dev
```

### 3.1 そのまま使えるファイル

| ファイル | 理由 |
|---------|------|
| `vite.config.ts` | ビルド設定は同一 |
| `tsconfig.*.json` | TypeScript設定は同一 |
| `eslint.config.js` | Lint設定は同一 |
| `netlify.toml` | Netlify設定は同一 |
| `src/lib/fortune.ts` | 数秘術ロジック（範囲変更のみ） |
| `src/lib/numerology-data.ts` | 数秘術データ（変更不要） |
| `src/lib/rokuyo.ts` | 六曜算出（変更不要） |
| `src/lib/kichijitsu.ts` | 吉日判定（変更不要） |
| `src/components/CookieConsent.tsx` | Cookie同意（変更不要） |
| `src/components/AdSlot.tsx` | 広告枠（変更不要） |
| `src/components/ShareQR.tsx` | QR共有（URL変更のみ） |
| `src/components/GlassCard.tsx` | UIコンポーネント（変更不要） |
| `src/components/BirthDateInput.tsx` | 生年月日入力（変更不要） |
| `src/pages/LegalPage.tsx` | 法的情報（サイト名変更のみ） |
| `src/index.css` | テーマ・アニメーション（微調整のみ） |

### 3.2 大幅書き換えが必要なファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/types.ts` | GameType → NumbersGameType、Result型を桁ベースに |
| `src/lib/analysis.ts` | 全分析関数を桁ベースに書き換え |
| `src/lib/prediction.ts` | LSTM入力を桁×10次元に変更 |
| `src/lib/sampleData.ts` | ナンバーズ用サンプルデータ生成 |
| `netlify/functions/fetch-results.ts` | ナンバーズCSVパーサー追加 |
| `src/hooks/useLotoData.ts` | Hook名変更、キャッシュキー変更 |
| `src/components/LotoBall.tsx` | → NumbersDigit.tsx に置換 |
| `src/components/GameSelector.tsx` | 2ゲーム対応に |
| `src/pages/DashboardPage.tsx` | ナンバーズ用表示に書き換え |
| `src/pages/AnalysisPage.tsx` | 桁別分析UIに書き換え |
| `src/pages/PredictionPage.tsx` | 桁別予測UIに書き換え |
| `src/pages/HistoryPage.tsx` | ナンバーズ履歴表示に書き換え |

### 3.3 新規作成が必要なファイル

| ファイル | 内容 |
|---------|------|
| `src/components/NumbersDigit.tsx` | 桁表示コンポーネント（LotoBallの代替） |
| `src/components/BetTypeSelector.tsx` | 申込タイプ選択UI |
| `public/images/bg-numbers-main.webp` | ナンバーズ用背景画像 |
| `public/images/bg-numbers-prediction.webp` | 予測ページ背景 |
| `public/images/bg-numbers-fortune.webp` | 占いページ背景 |

---

## 4. 実装優先順

1. **データソース調査**: thekyo.jp でナンバーズCSVが取得できるか確認
2. **types.ts**: NumbersGameType, NumbersGameConfig, NumbersResult 定義
3. **fetch-results.ts**: ナンバーズCSVパーサー実装
4. **useLotoData.ts → useNumbersData.ts**: データ取得Hook
5. **sampleData.ts**: ナンバーズ用フォールバックデータ
6. **analysis.ts**: 桁別分析関数の実装
7. **prediction.ts**: 桁別LSTM予測の実装
8. **fortune.ts**: ラッキーナンバー生成の範囲調整
9. **UI コンポーネント**: NumbersDigit, 各ページの書き換え
10. **背景画像**: AI生成→配置
11. **ビルド確認**: `npm run build`
12. **Netlifyデプロイ**: 新サイトとして作成

---

## 5. Netlifyデプロイ設定

```bash
# 新サイト作成（ロトアナライザーとは別サイト）
npx netlify login
npx netlify api createSite --data '{"name": "numbers-analyzer"}'
npx netlify link --id <新サイトID>
npx netlify deploy --prod --dir=dist
```

AdSense・Search Console も別途登録が必要。

---

## 6. 注意事項

### TypeScript設定（絶対変更しない）
- `verbatimModuleSyntax: false`
- `noUnusedLocals: false`
- `noUnusedParameters: false`

### TensorFlow.js フリーズ防止（必ず維持）
- `yieldToMain()` によるエポック間のUI解放
- 学習データ直近200件制限
- units=32, epochs=10

### Shift-JIS対応
thekyo.jp系のCSVは全て Shift-JIS。`TextDecoder('shift-jis')` を忘れないこと。

### localStorage キー設計
ロトアナライザーと共存する場合を考慮し、プレフィックスを分ける:
- ロト: `loto6_data`, `loto7_data`, `miniloto_data`
- ナンバーズ: `numbers3_data`, `numbers4_data`

### 占いの生年月日
`fortune_birthdate` キーで localStorage に保存済み。ロトアナライザーと共有可能。
