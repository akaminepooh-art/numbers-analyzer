import { useEffect, useRef } from 'react';

// 審査通過後にtrueに変更して有効化
const AD_ENABLED = false;

interface Props {
  slotId: string;
  format?: 'auto' | 'rectangle' | 'horizontal';
  className?: string;
}

export default function AdSlot({ slotId, format = 'auto', className = '' }: Props) {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!AD_ENABLED || pushed.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      pushed.current = true;
    } catch {}
  }, []);

  if (!AD_ENABLED) return null;

  return (
    <div className={`my-4 ${className}`}>
      <div ref={adRef}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-4671107688556806"
          data-ad-slot={slotId}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
