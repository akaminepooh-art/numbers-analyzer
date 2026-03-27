import { useState, useEffect, useCallback } from 'react';
import { NumbersResult, NumbersGameType, GAME_CONFIGS } from '../lib/types';
import { generateSampleData } from '../lib/sampleData';

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6時間

interface CacheEntry {
  data: NumbersResult[];
  timestamp: number;
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

    // Netlify Function からデータ取得を試行
    try {
      const res = await fetch(`/.netlify/functions/fetch-results?game=${gameType}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.length > 0) {
          setData(json.data);
          setSource(json.source || 'API');
          localStorage.setItem(cacheKey, JSON.stringify({
            data: json.data,
            timestamp: Date.now(),
          }));
          setLoading(false);
          return;
        }
      }
    } catch {
      console.log('Netlify Function not available, using sample data');
    }

    // フォールバック: サンプルデータ
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
