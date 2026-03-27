import { useState } from 'react';

export default function CookieConsent() {
  const [visible, setVisible] = useState(() => {
    return !localStorage.getItem('cookie_consent');
  });

  if (!visible) return null;

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 px-4 pb-2">
      <div className="max-w-2xl mx-auto glass-glow rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3">
        <p className="text-sm text-text-secondary flex-1">
          本サービスでは、広告配信のためにCookieを使用しています。サイトの利用を続けることで、Cookieの使用に同意したものとみなします。
        </p>
        <button
          onClick={accept}
          className="px-5 py-2.5 rounded-lg bg-accent text-bg-primary text-sm font-bold hover:bg-accent-light transition-colors shrink-0 min-h-[40px]"
        >
          同意する
        </button>
      </div>
    </div>
  );
}
