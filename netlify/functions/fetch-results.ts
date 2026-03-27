import type { Handler, HandlerEvent } from '@netlify/functions';

interface NumbersResult {
  round: number;
  date: string;
  digits: number[];
  straightPrize: number;
  boxPrize: number;
  setPrize: number;
  miniPrize?: number;
}

interface GameDef {
  url: string;
  digitCount: number;
  hasMini: boolean;
}

const GAME_DEFS: Record<string, GameDef> = {
  numbers3: {
    url: 'https://www.mk-mode.com/rails/loto/NUMBERS3_ALL.csv',
    digitCount: 3,
    hasMini: true,
  },
  numbers4: {
    url: 'https://www.mk-mode.com/rails/loto/NUMBERS4_ALL.csv',
    digitCount: 4,
    hasMini: false,
  },
};

// mk-mode.com CSVパーサー
//
// ナンバーズ3 CSV列:
//   0: No, 1: 抽選日, 2: 当選数字(3桁文字列 e.g."191"),
//   3: 口数[STR], 4: 口数[BOX], 5: 口数[SET-STR], 6: 口数[SET-BOX], 7: 口数[ミニ],
//   8: 金額[STR], 9: 金額[BOX], 10: 金額[SET-STR], 11: 金額[SET-BOX], 12: 金額[ミニ],
//   13: 販売実績
//
// ナンバーズ4 CSV列:
//   0: No, 1: 抽選日, 2: 当選数字(4桁文字列 e.g."1149"),
//   3: 口数[STR], 4: 口数[BOX], 5: 口数[SET-STR], 6: 口数[SET-BOX],
//   7: 金額[STR], 8: 金額[BOX], 9: 金額[SET-STR], 10: 金額[SET-BOX],
//   11: 販売実績
function parseCSV(csv: string, def: GameDef): NumbersResult[] {
  const lines = csv.trim().split('\n');
  const results: NumbersResult[] = [];

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
      // digitCountに合わせて左ゼロパディング
      const paddedStr = numStr.padStart(def.digitCount, '0');
      if (paddedStr.length !== def.digitCount) continue;

      const digits = paddedStr.split('').map(Number);
      if (digits.some(d => isNaN(d))) continue;

      if (def.hasMini) {
        // ナンバーズ3: 金額は cols[8]〜cols[12]
        const straightPrize = parseInt(cols[8]?.replace(/[^0-9]/g, '') || '0') || 0;
        const boxPrize = parseInt(cols[9]?.replace(/[^0-9]/g, '') || '0') || 0;
        // セットはSTR+BOXの平均的な値を使用
        const setStrPrize = parseInt(cols[10]?.replace(/[^0-9]/g, '') || '0') || 0;
        const setBoxPrize = parseInt(cols[11]?.replace(/[^0-9]/g, '') || '0') || 0;
        const setPrize = setStrPrize || setBoxPrize;
        const miniPrize = parseInt(cols[12]?.replace(/[^0-9]/g, '') || '0') || 0;

        results.push({
          round,
          date,
          digits,
          straightPrize,
          boxPrize,
          setPrize,
          miniPrize,
        });
      } else {
        // ナンバーズ4: 金額は cols[7]〜cols[10]
        const straightPrize = parseInt(cols[7]?.replace(/[^0-9]/g, '') || '0') || 0;
        const boxPrize = parseInt(cols[8]?.replace(/[^0-9]/g, '') || '0') || 0;
        const setStrPrize = parseInt(cols[9]?.replace(/[^0-9]/g, '') || '0') || 0;
        const setBoxPrize = parseInt(cols[10]?.replace(/[^0-9]/g, '') || '0') || 0;
        const setPrize = setStrPrize || setBoxPrize;

        results.push({
          round,
          date,
          digits,
          straightPrize,
          boxPrize,
          setPrize,
        });
      }
    } catch {
      continue;
    }
  }

  return results;
}

const handler: Handler = async (event: HandlerEvent) => {
  const params = event.queryStringParameters || {};
  const game = params.game || 'numbers3';
  const def = GAME_DEFS[game];

  if (!def) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: `不明なゲーム種別: ${game}` }),
    };
  }

  try {
    const res = await fetch(def.url, {
      headers: { 'User-Agent': 'NumbersAnalyzer/1.0' },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${def.url}`);
    }

    const buf = await res.arrayBuffer();
    // mk-mode.com はShift-JISの場合があるため、まずshift-jisで試す
    let csv: string;
    try {
      csv = new TextDecoder('shift-jis').decode(buf);
    } catch {
      csv = new TextDecoder('utf-8').decode(buf);
    }

    const data = parseCSV(csv, def);

    if (data.length > 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
        body: JSON.stringify({
          success: true,
          data,
          lastUpdated: new Date().toISOString(),
          source: 'mk-mode.com',
          totalRecords: data.length,
          game,
        }),
      };
    }

    throw new Error('パース結果が空でした');
  } catch (err) {
    console.error(`Failed to fetch ${game}:`, err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: `${game}のデータ取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
      }),
    };
  }
};

export { handler };
