import { PageId, NumbersGameType } from '../lib/types';
import GameSelector from './GameSelector';

interface HeaderProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  gameType: NumbersGameType;
  onGameChange: (game: NumbersGameType) => void;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
}

const navItems: { id: PageId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'ホーム', icon: '🏠' },
  { id: 'analysis', label: '分析', icon: '📈' },
  { id: 'prediction', label: '予測', icon: '🎯' },
  { id: 'fortune', label: '占い', icon: '🔮' },
  { id: 'history', label: '履歴', icon: '📋' },
];

export default function Header({ currentPage, onNavigate, gameType, onGameChange, theme, onThemeChange }: HeaderProps) {
  return (
    <>
      {/* ヘッダー */}
      <header className="glass sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
          <GameSelector current={gameType} onChange={onGameChange} />
          <button
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
            className="p-2.5 rounded-lg text-xl hover:bg-bg-card-hover/50 transition-colors shrink-0"
            title={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* フッター: ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass">
        <div className="max-w-7xl mx-auto flex justify-around items-center">
          {navItems.map(item => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-0.5 py-2.5 px-3 flex-1 transition-all ${
                  isActive
                    ? 'text-accent'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className={`text-2xl transition-transform ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]' : ''}`}>
                  {item.icon}
                </span>
                <span className={`text-xs font-bold ${isActive ? 'text-accent' : ''}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-accent glow-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
