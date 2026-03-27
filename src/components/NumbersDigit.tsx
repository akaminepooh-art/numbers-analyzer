interface NumbersDigitProps {
  digit: number;
  size?: 'sm' | 'md' | 'lg';
  position?: number;
  isPrediction?: boolean;
  delay?: number;
}

const DIGIT_COLORS = [
  '#64748b', // 0: slate
  '#ef4444', // 1: red
  '#f97316', // 2: orange
  '#eab308', // 3: yellow
  '#22c55e', // 4: green
  '#06b6d4', // 5: cyan
  '#3b82f6', // 6: blue
  '#8b5cf6', // 7: violet
  '#ec4899', // 8: pink
  '#dc2626', // 9: crimson
];

const sizes = {
  sm: 'w-8 h-10 text-sm sm:w-9 sm:h-11 sm:text-base',
  md: 'w-10 h-12 text-lg sm:w-12 sm:h-14 sm:text-xl',
  lg: 'w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl font-bold',
};

export default function NumbersDigit({ digit, size = 'md', isPrediction, delay = 0 }: NumbersDigitProps) {
  const sizeClass = sizes[size];
  const color = DIGIT_COLORS[digit];

  return (
    <span
      className={`${sizeClass} ${isPrediction ? 'prediction-ball' : ''} inline-flex items-center justify-center rounded-lg text-white font-mono font-bold ball-animate shrink-0`}
      style={{
        animationDelay: `${delay}ms`,
        background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
        boxShadow: `0 4px 12px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.2), 0 0 8px ${color}40`,
        borderBottom: `3px solid ${color}88`,
      }}
    >
      {digit}
    </span>
  );
}
