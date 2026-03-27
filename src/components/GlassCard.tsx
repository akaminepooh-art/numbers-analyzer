import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glow' | 'highlight';
  animate?: boolean;
  stagger?: number;
  onClick?: (e: React.MouseEvent) => void;
}

export default function GlassCard({ children, className = '', variant = 'default', animate = false, stagger, onClick }: Props) {
  const variantClass =
    variant === 'highlight' ? 'glass-highlight' :
    variant === 'glow' ? 'glass-glow' :
    'glass';

  const animClass = animate ? `animate-slide-up opacity-0 ${stagger ? `stagger-${stagger}` : ''}` : '';

  return (
    <div className={`${variantClass} rounded-xl ${animClass} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
