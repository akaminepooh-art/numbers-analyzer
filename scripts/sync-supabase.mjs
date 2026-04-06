#!/usr/bin/env node
/**
 * ナンバーズデータ → Supabase 同期スクリプト
 * public/data/*.json のデータを Supabase numbers_draws テーブルに同期する。
 * update-data.mjs の後に実行される。
 *
 * テーブル: numbers_draws
 * カラム: draw_type, draw_no, draw_date, result,
 *         prize_straight, winners_straight, prize_box, winners_box,
 *         prize_set, winners_set
 *
 * 使い方: node scripts/sync-supabase.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// scripts/.env から読み込み
config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL / SUPABASE_SERVICE_KEY が未設定です (scripts/.env)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DATA_DIR = join(__dirname, '..', 'public', 'data');

const GAMES = [
  { id: 'numbers3', drawType: 'numbers3' },
  { id: 'numbers4', drawType: 'numbers4' },
];

/**
 * JSONデータをnumbers_drawsテーブル形式に変換
 */
function toSupabaseRow(record, drawType) {
  return {
    draw_type: drawType,
    draw_no: record.round,
    draw_date: record.date,
    result: record.digits.join(''),
    prize_straight: record.straightPrize || 0,
    winners_straight: 0,  // JSONに口数データがないため0
    prize_box: record.boxPrize || 0,
    winners_box: 0,
    prize_set: record.setPrize || 0,
    winners_set: 0,
  };
}

async function syncGame(game) {
  const jsonPath = join(DATA_DIR, `${game.id}.json`);
  if (!existsSync(jsonPath)) {
    console.warn(`⚠ ${game.id}: JSONファイルが見つかりません`);
    return false;
  }

  const json = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  if (!json.success || !json.data?.length) {
    console.warn(`⚠ ${game.id}: データが空です`);
    return false;
  }

  // Supabaseから既存の最大draw_noを取得
  const { data: existing, error: fetchErr } = await supabase
    .from('numbers_draws')
    .select('draw_no')
    .eq('draw_type', game.drawType)
    .order('draw_no', { ascending: false })
    .limit(1);

  if (fetchErr) {
    console.error(`❌ ${game.id}: Supabase読み取りエラー: ${fetchErr.message}`);
    return false;
  }

  const maxDrawNo = existing?.[0]?.draw_no || 0;
  const newRecords = json.data.filter(r => r.round > maxDrawNo);

  if (newRecords.length === 0) {
    console.log(`  → ${game.id}: Supabase同期済み (最新: 第${maxDrawNo}回)`);
    return true;
  }

  // バッチupsert（1000件ずつ）
  const rows = newRecords.map(r => toSupabaseRow(r, game.drawType));
  const batchSize = 1000;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error: upsertErr } = await supabase
      .from('numbers_draws')
      .upsert(batch, { onConflict: 'draw_type,draw_no' });

    if (upsertErr) {
      console.error(`❌ ${game.id}: Supabase書き込みエラー: ${upsertErr.message}`);
      return false;
    }
  }

  console.log(`✅ ${game.id}: ${newRecords.length} records synced to Supabase (total: ${maxDrawNo + newRecords.length})`);
  return true;
}

async function main() {
  console.log(`🔢 Supabase同期開始: ${new Date().toISOString()}`);

  for (const game of GAMES) {
    console.log(`📤 ${game.id}: Supabaseに同期中...`);
    await syncGame(game);
  }

  console.log('\n🎉 Supabase同期完了');
}

main();
