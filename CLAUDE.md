# ナンバーズ アナライザー — Claude Code 設計仕様書

## プロジェクト概要

日本の数字選択式宝くじ（ナンバーズ3・ナンバーズ4）の過去の抽選結果を統計分析し、次回の番号を予測するWebアプリ。
クライアントサイド完結（TensorFlow.js）で、Netlifyにデプロイする想定。

**ベースプロジェクト**: ロトアナライザー（loto-analyzer）から派生。ナンバーズの「桁ごとの数字選択」に完全適応済み。

## 技術スタック

- **フロントエンド**: React 19 + TypeScript 5.9 + Vite 8 + Tailwind CSS 4
- **ML**: TensorFlow.js 4.22（LSTM、ブラウザ内学習・推論）
- **チャート**: Recharts 3
- **データ取得**: Netlify Functions（CORS回避用プロキシ、mk-mode.com）
- **キャッシュ**: localStorage（6時間TTL、ゲーム種別ごとに分離）

## 対象ゲーム

| ゲーム | 番号構成 | 抽選日 | 申込タイプ |
|--------|---------|--------|-----------|
| ナンバーズ3 | 0〜9 × 3桁 (000〜999) | 月〜金 | ストレート/ボックス/セット/ミニ |
| ナンバーズ4 | 0〜9 × 4桁 (0000〜9999) | 月〜金 | ストレート/ボックス/セット |

## ロトとの根本的な違い

- **ロト**: 1〜N から K個選択（組合せ、重複なし、順序無関係）
- **ナンバーズ**: 各桁が独立した0〜9（重複あり、順序重要）
- 分析・予測は全て「桁別」で行う

## ディレクトリ構成

```
numbers-analyzer/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js
├── netlify.toml
├── netlify/functions/
│   └── fetch-results.ts          # CSV取得プロキシ（mk-mode.com）
├── public/images/                 # 背景画像（任意）
├── src/
│   ├── main.tsx
│   ├── App.tsx                    # ゲーム切替、テーマ、ルーティング
│   ├── index.css                  # Tailwind + カスタムテーマ + アニメーション
│   ├── lib/
│   │   ├── types.ts               # NumbersGameConfig, NumbersResult, 全型定義
│   │   ├── analysis.ts            # 桁別統計分析（8関数）
│   │   ├── prediction.ts          # 桁別予測（統計/LSTM）
│   │   ├── fortune.ts             # 数秘術（0〜9桁投影）
│   │   ├── numerology-data.ts     # 数秘術プロフィール（変更不要）
│   │   ├── rokuyo.ts              # 六曜（変更不要）
│   │   ├── kichijitsu.ts          # 吉日判定（変更不要）
│   │   └── sampleData.ts          # フォールバックデータ
│   ├── hooks/
│   │   └── useNumbersData.ts      # データ取得Hook
│   ├── components/
│   │   ├── NumbersDigit.tsx        # 桁表示（デジタル風、色分け）
│   │   ├── GameSelector.tsx        # ナンバーズ3/4切替タブ
│   │   ├── Header.tsx              # ヘッダー + ボトムナビ
│   │   ├── GlassCard.tsx           # グラスモーフィズムカード
│   │   ├── FortuneCard.tsx         # 占いダッシュボードカード
│   │   ├── FortuneCalendar.tsx     # 購入おすすめカレンダー
│   │   ├── BirthDateInput.tsx      # 生年月日入力
│   │   ├── AdSlot.tsx              # 広告枠（フラグ制御）
│   │   ├── ShareQR.tsx             # QR共有モーダル
│   │   ├── CookieConsent.tsx       # Cookie同意
│   │   └── Disclaimer.tsx          # 免責事項
│   └── pages/
│       ├── DashboardPage.tsx       # 最新結果、頻度、ホット/コールド
│       ├── AnalysisPage.tsx        # 5タブ分析（頻度/ギャップ/相関/分布/トレンド）
│       ├── PredictionPage.tsx      # 3手法予測（統計/AI/運勢）
│       ├── FortunePage.tsx         # 数秘術プロフィール、カレンダー
│       ├── HistoryPage.tsx         # 抽選履歴テーブル
│       └── LegalPage.tsx           # 法的情報
```

## データソース

- **ナンバーズ3**: `https://www.mk-mode.com/rails/loto/NUMBERS3_ALL.csv`
- **ナンバーズ4**: `https://www.mk-mode.com/rails/loto/NUMBERS4_ALL.csv`
- エンコーディング: Shift-JIS（`TextDecoder('shift-jis')`）

### CSV列構成

**ナンバーズ3** (14列):
`No, 抽選日, 当選数字(3桁), 口数[STR], 口数[BOX], 口数[SET-STR], 口数[SET-BOX], 口数[ミニ], 金額[STR], 金額[BOX], 金額[SET-STR], 金額[SET-BOX], 金額[ミニ], 販売実績`

**ナンバーズ4** (12列):
`No, 抽選日, 当選数字(4桁), 口数[STR], 口数[BOX], 口数[SET-STR], 口数[SET-BOX], 金額[STR], 金額[BOX], 金額[SET-STR], 金額[SET-BOX], 販売実績`

## LSTM予測の設計

入力次元: `digitCount × 10`（ナンバーズ3=30次元、ナンバーズ4=40次元）
各桁を10次元のone-hotベクトルとして連結。

## 注意事項

### TypeScript設定（絶対変更しない）
- `verbatimModuleSyntax: false`
- `noUnusedLocals: false`
- `noUnusedParameters: false`

### TensorFlow.js フリーズ防止（必ず維持）
- `yieldToMain()` によるエポック間のUI解放
- 学習データ直近200件制限
- units=32, epochs=10

### localStorage キー設計
- `numbers3_data`, `numbers4_data`: 抽選データキャッシュ
- `numbers3_predictions`, `numbers4_predictions`: 予測履歴
- `numbers_theme`: テーマ設定
- `fortune_birthdate`: 生年月日（ロトアナライザーと共有可能）

## ビルド & 実行

```bash
npm install
npm run dev      # 開発サーバー (localhost:5173)
npm run build    # 本番ビルド → dist/
npm run preview  # ビルド確認
```
