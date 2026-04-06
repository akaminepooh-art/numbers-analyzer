import { useState, useEffect, useCallback } from 'react';
import { NumbersResult, NumbersGameType, GAME_CONFIGS } from '../lib/types';
import { generateSampleData } from '../lib/sampleData';
import { supabase } from '../lib/supabase';

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6時間

interface CacheEntry {
  data: NumbersResult[];
  timestamp: number;
}

/**
 * Supabase numbers_draws テーブルから NumbersResult[] に変換
 */
function fromSupabaseRows(rows: any[], gameType: NumbersGameType): NumbersResult[] {
  const digitCount = GAME_CONFIGS[gameType].digitCount;
  return rows.map(row => {
    const resultStr = String(row.result).padStart(digitCount, '0');
    const digits = resultStr.split('').map(Number);
    const base: NumbersResult = {
      round: row.draw_no,
      date: row.draw_date,
      digits,
      straightPrize: row.prize_straight || 0,
      boxPrize: row.prize_box || 0,
      setPrize: row.prize_set || 0,
    };
    if (gameType === 'numbers3') {
      base.miniPrize = 0;
    }
    return base;
  });
}

export function useNumbersData(gameType: NumbersGameType) {
  const [data, setData] = useState<NumbersResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>('');

  const config = GAME_CONFIGS[gameType];
  const cacheKey = `${gameType}_data`;

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    // キャッシュ確認
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          if (Date.now() - entry.timestamp < CACHE_TTL) {
            setData(entry.data);
            setSource('キャッシュ');
            setLoading(false);
            return;
          }
        }
      } catch {
        // キャッシュ読み込みエラーは無視
      }
    }

    // 1. 自前ホスティングJSONからデータ取得（プライマリ）
    try {
      const res = await fetch(`/data/${gameType}.json`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.length > 0) {
          setData(json.data);
          setSource(json.source || 'self-hosted');
          localStorage.setItem(cacheKey, JSON.stringify({
            data: json.data,
            timestamp: Date.now(),
          }));
          setLoading(false);
          return;
        }
      }
    } catch {
      console.log('Static data not available, trying Supabase...');
    }

    // 2. Supabase フォールバック
    if (supabase) {
      try {
        const { data: rows, error: sbErr } = await supabase
          .from('numbers_draws')
          .select('*')
          .eq('draw_type', gameType)
          .order('draw_no', { ascending: true });

        if (!sbErr && rows && rows.length > 0) {
          const converted = fromSupabaseRows(rows, gameType);
          setData(converted);
          setSource('Supabase');
          localStorage.setItem(cacheKey, JSON.stringify({
            data: converted,
            timestamp: Date.now(),
          }));
          setLoading(false);
          return;
        }
      } catch {
        console.log('Supabase not available, using sample data');
      }
    }

    // 3. フォールバック: サンプルデータ
    const sample = generateSampleData(config);
    setData(sample);
    setSource('サンプルデータ');
    setLoading(false);
  }, [gameType, cacheKey, config]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, source, refresh: () => fetchData(true) };
}
