import { NumbersGameType, GAME_CONFIGS } from '../lib/types';

interface GameSelectorProps {
  current: NumbersGameType;
  onChange: (game: NumbersGameType) => void;
}

const games: NumbersGameType[] = ['numbers3', 'numbers4'];

export default function GameSelector({ current, onChange }: GameSelectorProps) {
  return (
    <div className="flex gap-1.5 rounded-xl p-1.5 flex-1" style={{ background: 'rgba(0,0,0,0.2)' }}>
      {games.map(id => {
        const cfg = GAME_CONFIGS[id];
        const isActive = current === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex-1 px-2 sm:px-3 py-3 rounded-xl text-sm sm:text-base font-bold transition-all min-h-[48px] whitespace-nowrap ${
              isActive
                ? 'text-white shadow-lg scale-[1.02]'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            style={isActive ? {
              backgroundColor: cfg.color,
              boxShadow: `0 0 20px ${cfg.color}40, 0 4px 15px rgba(0,0,0,0.3)`,
            } : undefined}
          >
            <span className="mr-1">{cfg.emoji}</span>
            {cfg.name}
          </button>
        );
      })}
    </div>
  );
}
