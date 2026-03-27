import { useMemo } from 'react';
import { BirthDate, GAME_CONFIGS } from '../lib/types';
import { generateFortuneCalendar } from '../lib/fortune';
import { getKichijitsu } from '../lib/kichijitsu';
import NumbersDigit from './NumbersDigit';

interface Props {
  birthDate: BirthDate;
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

export default function FortuneCalendar({ birthDate }: Props) {
  const calendar = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return generateFortuneCalendar(birthDate, today);
  }, [birthDate]);

  const stars = (score: number) => '★'.repeat(score) + '☆'.repeat(5 - score);

  if (calendar.length === 0) return null;

  return (
    <div className="space-y-2">
      {calendar.map((f) => {
        const d = new Date(f.date);
        const gc = f.gameType ? GAME_CONFIGS[f.gameType] : null;
        const isToday = new Date().toDateString() === d.toDateString();
        const kichijitsu = getKichijitsu(d);

        return (
          <div
            key={`${f.date}-${f.gameType}`}
            className={`rounded-lg p-3 border transition-colors ${
              isToday
                ? 'bg-accent/10 border-accent/40'
                : f.score >= 4
                ? 'bg-yellow-900/10 border-yellow-700/30'
                : 'glass border-border/50'
            }`}
          >
            <div className="flex items-center gap-3 flex-wrap">
              {/* 日付 */}
              <div className="w-28 shrink-0">
                <span className={`text-base font-mono ${isToday ? 'text-accent font-bold' : 'text-text-primary'}`}>
                  {d.getMonth() + 1}/{d.getDate()}({DAY_NAMES[d.getDay()]})
                </span>
                {isToday && <span className="text-xs text-accent ml-1 font-bold">TODAY</span>}
              </div>

              {/* ゲーム名 */}
              {gc && (
                <span
                  className="text-sm font-bold px-2.5 py-1 rounded-full shrink-0"
                  style={{ backgroundColor: gc.color + '22', color: gc.color }}
                >
                  {gc.emoji} {gc.name}
                </span>
              )}

              {/* 星スコア */}
              <span className={`text-base tracking-wider shrink-0 ${f.score >= 4 ? 'star-twinkle' : ''}`} style={{ color: '#FFD700' }}>
                {stars(f.score)}
              </span>

              {/* ラベル */}
              <span className={`text-sm font-bold shrink-0 ${
                f.score >= 4 ? 'text-emerald-400' :
                f.score >= 3 ? 'text-text-primary' :
                'text-text-secondary'
              }`}>
                {f.label}
              </span>

              {/* 吉日バッジ */}
              {kichijitsu.length > 0 && (
                <div className="flex gap-1">
                  {kichijitsu.map(k => (
                    <span key={k.name} className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: k.color + '22', color: k.color }}>
                      {k.emoji}{k.name}
                    </span>
                  ))}
                </div>
              )}

              {/* メッセージ */}
              <span className="text-sm text-text-secondary hidden sm:inline">
                — {f.message}
              </span>
            </div>

            {/* ラッキーナンバー */}
            {f.score >= 3 && gc && f.luckyDigits[0] && (
              <div className="flex items-center gap-2 mt-2 ml-28">
                <span className="text-sm text-text-secondary">Lucky:</span>
                <div className="flex gap-1">
                  {f.luckyDigits[0].map((n, i) => (
                    <NumbersDigit key={i} digit={n} size="sm" />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
