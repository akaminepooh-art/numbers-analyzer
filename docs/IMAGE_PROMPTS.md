# ナンバーズアナライザー — 背景画像生成プロンプト

画像生成AI（DALL-E、Midjourney、Stable Diffusion等）で使用するプロンプト集。
生成後は `public/images/` に配置し、WebP形式に変換すること。

---

## 1. メイン背景 (`bg-main.webp`)

**用途**: 全ページの背景画像（ダークテーマ）

```
A dark, atmospheric digital background with floating translucent numbers (0-9) scattered across a deep navy-purple gradient sky. Glowing neon digits in red and violet tones drift like constellations. Subtle golden particle effects and light streaks. Abstract, futuristic, lottery-themed atmosphere. No text, no people. Ultra-wide aspect ratio 16:9, high resolution, digital art style.
```

---

## 2. 予測ページ背景 (`bg-prediction.webp`)

**用途**: 予測ページ専用の背景

```
A mystical dark background featuring a neural network visualization with glowing nodes and connections in red and purple. Digital numbers 0-9 flow through the network like data streams. Circuit board patterns blend into a starry cosmos. AI and technology aesthetic with warm golden accents. Abstract, no text, no people. 16:9 aspect ratio, digital art.
```

---

## 3. 占いページ背景 (`bg-fortune.webp`)

**用途**: 占いページ専用の背景

```
A magical dark purple-indigo background with celestial elements. A glowing crystal ball or mystical orb at the center emanating golden-purple light. Zodiac symbols and numerology numbers floating ethereally. Stars, moon crescents, and sacred geometry patterns. Mystical, fortune-telling atmosphere with warm gold accents. No text, no people. 16:9 aspect ratio, digital fantasy art.
```

---

## 4. ヒーロー装飾 (`hero-ball.png`)

**用途**: ダッシュボードの装飾画像（透過PNG）

```
A single glowing digital slot machine display showing random numbers, viewed at a slight angle. Neon red and purple glow effect. Transparent background (PNG). Clean, modern, glossy 3D render style. No text labels, just the number display unit itself.
```

---

## 5. 占い装飾 (`lucky-cat.png`)

**用途**: 占いページの装飾画像（透過PNG）

```
A cute stylized Japanese maneki-neko (lucky cat) figurine holding a golden lottery ticket, glowing with mystical purple-gold aura. Kawaii art style, slightly transparent edges. PNG with transparent background. Warm, inviting, lucky charm aesthetic.
```

---

## 画像仕様

| ファイル | サイズ | 形式 | 備考 |
|---------|--------|------|------|
| bg-main.webp | 1920x1080 | WebP | 圧縮品質75% |
| bg-prediction.webp | 1920x1080 | WebP | 圧縮品質75% |
| bg-fortune.webp | 1920x1080 | WebP | 圧縮品質75% |
| hero-ball.png | 512x512 | PNG | 透過背景 |
| lucky-cat.png | 512x512 | PNG | 透過背景 |

## 配置方法

```bash
# 生成した画像を配置
cp generated-images/* public/images/

# WebP変換（cwebpコマンドがある場合）
cwebp -q 75 bg-main.png -o public/images/bg-main.webp
```

背景画像がなくてもCSSグラデーションフォールバックで動作するため、画像配置は任意。
