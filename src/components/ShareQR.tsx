import { useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';

const SITE_URL = 'https://numbers-analyzer.netlify.app';

interface Props {
  cardMode?: boolean;
}

export default function ShareQR({ cardMode }: Props) {
  const [open, setOpen] = useState(false);

  const qrIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary">
      <rect x="2" y="2" width="8" height="8" rx="1" />
      <rect x="14" y="2" width="8" height="8" rx="1" />
      <rect x="2" y="14" width="8" height="8" rx="1" />
      <rect x="5" y="5" width="2" height="2" fill="currentColor" stroke="none" />
      <rect x="17" y="5" width="2" height="2" fill="currentColor" stroke="none" />
      <rect x="5" y="17" width="2" height="2" fill="currentColor" stroke="none" />
      <rect x="14" y="14" width="2" height="2" fill="currentColor" stroke="none" />
      <rect x="18" y="14" width="2" height="2" fill="currentColor" stroke="none" />
      <rect x="14" y="18" width="2" height="2" fill="currentColor" stroke="none" />
      <rect x="18" y="18" width="4" height="4" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );

  return (
    <>
      {cardMode ? (
        <button
          onClick={() => setOpen(true)}
          className="glass-glow rounded-xl p-5 w-full flex items-center gap-4 text-left hover:brightness-110 transition-all min-h-[64px]"
        >
          <span className="text-3xl">📱</span>
          <div className="flex-1">
            <div className="text-base font-bold text-text-primary">友達にも教える</div>
            <div className="text-sm text-text-secondary">QRコードでかんたん共有</div>
          </div>
          {qrIcon}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="p-2.5 rounded-lg hover:bg-bg-card-hover/50 transition-colors"
          title="共有QRコード"
        >
          {qrIcon}
        </button>
      )}

      {open && createPortal(
        <div
          className="fixed inset-0"
          style={{ zIndex: 99999 }}
          onClick={() => setOpen(false)}
        >
          <div className="fixed inset-0 bg-black/70" />
          <div
            className="fixed rounded-xl p-6 text-center"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(10, 14, 39, 0.95)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              boxShadow: '0 0 30px rgba(255, 215, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-4 text-text-secondary hover:text-text-primary text-xl"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-text-primary mb-2">ナンバーズ アナライザー</h3>
            <p className="text-sm text-text-secondary mb-4">QRコードをスキャンしてアクセス</p>
            <div className="inline-block p-3 bg-white rounded-xl">
              <QRCodeSVG
                value={SITE_URL}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-text-secondary mt-3 break-all">{SITE_URL}</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
