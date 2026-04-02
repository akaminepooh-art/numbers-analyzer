#!/usr/bin/env node
/**
 * ナンバーズデータ更新スクリプト
 * 楽天×宝くじの当月・前月ページから最新の抽選結果を取得し、
 * 既存の public/data/*.json に差分マージする。
 * GitHub Actions から毎営業日翌朝に自動実行される。
 *
 * 使い方: node scripts/update-data.mjs
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data');

const GAMES = [
  { id: 'numbers3', path: 'numbers3', hasMini: true, digitCount: 3 },
  { id: 'numbers4', path: 'numbers4', hasMini: false, digitCount: 4 },
];

/**
 * 楽天×宝くじの月別ページHTMLをパースして抽選結果を抽出
 */
function parseRakutenHTML(html, game) {
  const results = [];

  // テーブル単位で分割: 各回号のデータブロックを抽出
  // パターン: 回号 → 抽せん日 → 当せん番号 → ストレート → ボックス → セット(STR) → セット(BOX) [→ ミニ]
  const roundPattern = /第(\d+)回/g;
  const rounds = [];
  let match;
  while ((match = roundPattern.exec(html)) !== null) {
    rounds.push({ round: parseInt(match[1]), index: match.index });
  }

  for (let i = 0; i < rounds.length; i++) {
    const startIdx = rounds[i].index;
    const endIdx = i + 1 < rounds.length ? rounds[i + 1].index : html.length;
    const block = html.substring(startIdx, endIdx);
    const round = rounds[i].round;

    try {
      // 抽せん日: "2026/03/02" のパターン
      const dateMatch = block.match(/(\d{4})\/(\d{2})\/(\d{2})/);
      if (!dateMatch) continue;
      const date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;

      // 当せん番号: <td colspan="2">132</td> のパターン
      // 当せん番号の直後のtdを探す
      const numberSection = block.substring(block.indexOf('当せん番号'));
      if (!numberSection) continue;
      const numMatch = numberSection.match(/<td[^>]*>(\d+)<\/td>/);
      if (!numMatch) continue;

      const numStr = numMatch[1].padStart(game.digitCount, '0');
      const digits = numStr.split('').map(Number);

      // 金額: "93,500円" のパターンから数値を抽出
      const pricePattern = /<td class="price">([\d,]+)円<\/td>/g;
      const prices = [];
      let priceMatch;
      while ((priceMatch = pricePattern.exec(block)) !== null) {
        prices.push(parseInt(priceMatch[1].replace(/,/g, '')));
      }

      // ナンバーズ3: ストレート, ボックス, セット(STR), セット(BOX), ミニ = 5つ
      // ナンバーズ4: ストレート, ボックス, セット(STR), セット(BOX) = 4つ
      if (game.hasMini && prices.length >= 5) {
        results.push({
          round,
          date,
          digits,
          straightPrize: prices[0],
          boxPrize: prices[1],
          setPrize: prices[2] || prices[3],
          miniPrize: prices[4],
        });
      } else if (!game.hasMini && prices.length >= 4) {
        results.push({
          round,
          date,
          digits,
          straightPrize: prices[0],
          boxPrize: prices[1],
          setPrize: prices[2] || prices[3],
        });
      }
    } catch {
      continue;
    }
  }

  return results;
}

/**
 * 楽天×宝くじから指定月のデータを取得
 */
async function fetchMonth(game, yearMonth) {
  const url = `https://takarakuji.rakuten.co.jp/backnumber/${game.path}/${yearMonth}/`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.9',
      },
    });
    if (!res.ok) {
      if (res.status === 404) return []; // 月データなし
      throw new Error(`HTTP ${res.status}`);
    }
    const html = await res.text();
    return parseRakutenHTML(html, game);
  } catch (err) {
    console.warn(`  ⚠ ${yearMonth}: ${err.message}`);
    return [];
  }
}

/**
 * 当月と前月のデータを取得して既存JSONにマージ
 */
async function updateGame(game) {
  const outPath = join(DATA_DIR, `${game.id}.json`);

  // 既存データ読み込み
  let existing = { success: true, data: [], lastUpdated: '', source: 'self-hosted', totalRecords: 0, game: game.id };
  if (existsSync(outPath)) {
    try {
      existing = JSON.parse(readFileSync(outPath, 'utf-8'));
    } catch {
      console.warn(`  ⚠ 既存JSON読み込み失敗、新規作成します`);
    }
  }

  const existingRounds = new Set(existing.data.map(d => d.round));
  const maxExistingRound = existing.data.length > 0 ? Math.max(...existing.data.map(d => d.round)) : 0;

  // 当月と前月を取得
  const now = new Date();
  const months = [];
  months.push(now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0'));
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  months.push(prev.getFullYear().toString() + (prev.getMonth() + 1).toString().padStart(2, '0'));

  console.log(`📥 ${game.id}: 楽天×宝くじから取得中 (${months.join(', ')})...`);

  let newRecords = [];
  for (const month of months) {
    const records = await fetchMonth(game, month);
    // 既存にない新しいレコードのみ追加
    const fresh = records.filter(r => !existingRounds.has(r.round));
    newRecords.push(...fresh);
  }

  if (newRecords.length === 0) {
    console.log(`  → ${game.id}: 新しいデータなし (最新: 第${maxExistingRound}回)`);
    return false;
  }

  // マージしてround順にソート
  const merged = [...existing.data, ...newRecords];
  merged.sort((a, b) => a.round - b.round);

  // 重複除去（念のため）
  const seen = new Set();
  const deduped = merged.filter(r => {
    if (seen.has(r.round)) return false;
    seen.add(r.round);
    return true;
  });

  const output = {
    success: true,
    data: deduped,
    lastUpdated: new Date().toISOString(),
    source: 'self-hosted',
    totalRecords: deduped.length,
    game: game.id,
  };

  writeFileSync(outPath, JSON.stringify(output));
  console.log(`✅ ${game.id}: ${newRecords.length} new records added (total: ${deduped.length})`);
  return true;
}

async function main() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  console.log(`🔢 ナンバーズデータ更新開始: ${new Date().toISOString()}`);
  const results = [];
  for (const game of GAMES) {
    const updated = await updateGame(game);
    results.push(updated);
  }

  const anyUpdated = results.some(Boolean);
  if (anyUpdated) {
    console.log('\n🎉 データ更新完了');
  } else {
    console.log('\nℹ️  更新なし');
  }
}

main();
