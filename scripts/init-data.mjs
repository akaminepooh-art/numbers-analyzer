#!/usr/bin/env node
/**
 * ナンバーズデータ初期化スクリプト
 * mk-mode.com から全履歴 CSV を取得し public/data/*.json を生成する。
 * 初回のみ手動実行。以降は update-data.mjs で差分更新。
 *
 * 使い方: node scripts/init-data.mjs
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data');

const GAMES = [
  {
    id: 'numbers3',
    url: 'https://www.mk-mode.com/rails/loto/NUMBERS3_ALL.csv',
    digitCount: 3,
    hasMini: true,
  },
  {
    id: 'numbers4',
    url: 'https://www.mk-mode.com/rails/loto/NUMBERS4_ALL.csv',
    digitCount: 4,
    hasMini: false,
  },
];

function parseCSV(csv, { digitCount, hasMini }) {
  const lines = csv.trim().split('\n');
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === 'EOF') continue;

    const cols = line.split(',');
    if (cols.length < 8) continue;

    try {
      const round = parseInt(cols[0]);
      if (isNaN(round)) continue;

      // 日付: "1994/10/07" → "1994-10-07"
      const date = (cols[1]?.trim() || '').replace(/\//g, '-');

      // 当選数字: "191" or "0097" — 先頭ゼロを保持するため文字列として処理
      const numStr = cols[2]?.trim() || '';
      const paddedStr = numStr.padStart(digitCount, '0');
      if (paddedStr.length !== digitCount) continue;

      const digits = paddedStr.split('').map(Number);
      if (digits.some(d => isNaN(d))) continue;

      if (hasMini) {
        // ナンバーズ3: 金額は cols[8]〜cols[12]
        const straightPrize = parseInt(cols[8]?.replace(/[^0-9]/g, '') || '0') || 0;
        const boxPrize = parseInt(cols[9]?.replace(/[^0-9]/g, '') || '0') || 0;
        const setStrPrize = parseInt(cols[10]?.replace(/[^0-9]/g, '') || '0') || 0;
        const setBoxPrize = parseInt(cols[11]?.replace(/[^0-9]/g, '') || '0') || 0;
        const setPrize = setStrPrize || setBoxPrize;
        const miniPrize = parseInt(cols[12]?.replace(/[^0-9]/g, '') || '0') || 0;

        results.push({ round, date, digits, straightPrize, boxPrize, setPrize, miniPrize });
      } else {
        // ナンバーズ4: 金額は cols[7]〜cols[10]
        const straightPrize = parseInt(cols[7]?.replace(/[^0-9]/g, '') || '0') || 0;
        const boxPrize = parseInt(cols[8]?.replace(/[^0-9]/g, '') || '0') || 0;
        const setStrPrize = parseInt(cols[9]?.replace(/[^0-9]/g, '') || '0') || 0;
        const setBoxPrize = parseInt(cols[10]?.replace(/[^0-9]/g, '') || '0') || 0;
        const setPrize = setStrPrize || setBoxPrize;

        results.push({ round, date, digits, straightPrize, boxPrize, setPrize });
      }
    } catch {
      continue;
    }
  }

  return results;
}

async function fetchGame(game) {
  const outPath = join(DATA_DIR, `${game.id}.json`);

  try {
    console.log(`📥 ${game.id}: ${game.url} からデータ取得中...`);
    const res = await fetch(game.url, {
      headers: { 'User-Agent': 'NumbersAnalyzer/2.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buf = await res.arrayBuffer();
    // mk-mode.com は Shift-JIS
    const csv = new TextDecoder('shift-jis').decode(new Uint8Array(buf));
    const data = parseCSV(csv, game);

    if (data.length === 0) throw new Error('パース結果が空');

    const output = {
      success: true,
      data,
      lastUpdated: new Date().toISOString(),
      source: 'self-hosted',
      totalRecords: data.length,
      game: game.id,
    };

    writeFileSync(outPath, JSON.stringify(output));
    console.log(`✅ ${game.id}: ${data.length} records saved`);
    return true;
  } catch (err) {
    console.error(`❌ ${game.id}: ${err.message}`);
    return false;
  }
}

async function main() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  console.log(`🔢 ナンバーズデータ初期化開始: ${new Date().toISOString()}`);
  const results = await Promise.all(GAMES.map(fetchGame));
  const allOk = results.every(Boolean);

  if (!allOk) {
    console.log('\n⚠️  一部のデータ取得に失敗しました。');
    process.exit(1);
  } else {
    console.log('\n🎉 全データ初期化完了');
  }
}

main();
