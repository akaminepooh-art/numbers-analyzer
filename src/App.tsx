import { useState, useEffect, useRef, useCallback } from 'react';
import { PageId, NumbersGameType, GAME_CONFIGS } from './lib/types';
import { useNumbersData } from './hooks/useNumbersData';
import Header from './components/Header';
import Disclaimer from './components/Disclaimer';
import CookieConsent from './components/CookieConsent';
import DashboardPage from './pages/DashboardPage';
import AnalysisPage from './pages/AnalysisPage';
import PredictionPage from './pages/PredictionPage';
import FortunePage from './pages/FortunePage';
import HistoryPage from './pages/HistoryPage';
import LegalPage from './pages/LegalPage';
import AdSlot from './components/AdSlot';

const GAME_ORDER: NumbersGameType[] = ['numbers3', 'numbers4'];

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [gameType, setGameType] = useState<NumbersGameType>('numbers3');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('numbers_theme') as 'dark' | 'light') || 'dark';
  });
  const config = GAME_CONFIGS[gameType];
  const { data, loading, error, refresh } = useNumbersData(gameType);

  // テーマ切り替え
  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    localStorage.setItem('numbers_theme', theme);
  }, [theme]);

  // スワイプ検出
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const switchGame = useCallback((direction: 'left' | 'right') => {
    const currentIndex = GAME_ORDER.indexOf(gameType);
    let nextIndex: number;
    if (direction === 'left') {
      nextIndex = currentIndex + 1;
      if (nextIndex >= GAME_ORDER.length) return;
    } else {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) return;
    }
    setGameType(GAME_ORDER[nextIndex]);
  }, [gameType]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      touchStartRef.current = null;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        switchGame(dx < 0 ? 'left' : 'right');
      }
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [switchGame]);

  // ゲーム切り替え時にテーマカラーを更新
  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', config.color);
    document.documentElement.style.setProperty('--color-accent-light', config.colorLight);
  }, [config]);

  return (
    <div className="min-h-screen text-text-primary">
      <Header
        currentPage={page}
        onNavigate={setPage}
        gameType={gameType}
        onGameChange={setGameType}
        theme={theme}
        onThemeChange={setTheme}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {page === 'legal' ? (
          <div key="legal" className="animate-fade-in">
            <LegalPage />
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-text-secondary text-base">{config.name} のデータを読み込み中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4 text-base">{error}</p>
            <button onClick={refresh} className="px-6 py-3 bg-accent text-bg-primary rounded-lg text-base font-bold">
              再試行
            </button>
          </div>
        ) : (
          <div key={page} className="animate-fade-in">
            {page === 'dashboard' && <DashboardPage data={data} config={config} onNavigate={setPage} />}
            {page === 'analysis' && <AnalysisPage data={data} config={config} />}
            {page === 'prediction' && <PredictionPage data={data} config={config} />}
            {page === 'fortune' && <FortunePage config={config} />}
            {page === 'history' && <HistoryPage data={data} config={config} />}
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-4 pb-24">
        <AdSlot slotId="SLOT_E_FOOTER" format="horizontal" />
        <Disclaimer config={config} onNavigate={setPage} />
      </footer>

      <CookieConsent />
    </div>
  );
}
