import { useState } from 'react';
import GlassCard from '../components/GlassCard';

type Tab = 'privacy' | 'terms' | 'disclaimer';

const tabs: { id: Tab; label: string }[] = [
  { id: 'privacy', label: 'プライバシーポリシー' },
  { id: 'terms', label: '利用規約' },
  { id: 'disclaimer', label: '免責事項' },
];

export default function LegalPage() {
  const [tab, setTab] = useState<Tab>('privacy');

  return (
    <div className="space-y-4">
      <GlassCard className="p-1.5">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 px-2 py-3 rounded-md text-sm font-bold transition-colors text-center min-h-[44px] ${
                tab === t.id ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}>{t.label}</button>
          ))}
        </div>
      </GlassCard>
      <GlassCard className="p-6">
        {tab === 'privacy' && <PrivacyPolicy />}
        {tab === 'terms' && <TermsOfService />}
        {tab === 'disclaimer' && <DisclaimerDetail />}
      </GlassCard>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-bold text-text-primary mt-6 mb-2">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-base text-text-secondary leading-relaxed mb-3">{children}</p>;
}

function PrivacyPolicy() {
  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-4">プライバシーポリシー</h2>
      <P>ナンバーズアナライザー運営（以下「当運営」）は、本サービス「ナンバーズアナライザー」におけるユーザーのプライバシーを尊重し、個人情報の保護に努めます。</P>
      <SectionTitle>1. 収集する情報</SectionTitle>
      <P><strong>生年月日情報:</strong> 占い機能で入力された生年月日は、お使いのブラウザのlocalStorage（端末内）にのみ保存されます。当運営のサーバーには一切送信されません。</P>
      <P><strong>予測履歴:</strong> 予測結果の履歴もlocalStorageにのみ保存され、サーバーには送信されません。</P>
      <SectionTitle>2. Cookie（クッキー）について</SectionTitle>
      <P>本サービスでは、広告配信のためにCookieを使用しています。</P>
      <SectionTitle>3. データの保存場所</SectionTitle>
      <P>本サービスで入力・生成されるデータは、すべてユーザーのブラウザ内（localStorage）に保存されます。</P>
      <P>ナンバーズの抽選結果データは、外部サイトから取得しており、当運営が独自に保有するものではありません。</P>
      <SectionTitle>4. 第三者提供</SectionTitle>
      <P>当運営は、法令に基づく場合を除き、ユーザーの個人情報を第三者に提供することはありません。</P>
    </div>
  );
}

function TermsOfService() {
  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-4">利用規約</h2>
      <SectionTitle>1. サービスの性質</SectionTitle>
      <P>本サービスは、ナンバーズ3・ナンバーズ4の過去の抽選結果を統計分析し、予測番号を生成するエンターテインメントツールです。</P>
      <P>本サービスは宝くじの当選を保証するものではなく、いかなる投資助言も行いません。</P>
      <SectionTitle>2. 利用料金</SectionTitle>
      <P>本サービスは無料でご利用いただけます。ただし、広告が表示される場合があります。</P>
      <SectionTitle>3. 免責</SectionTitle>
      <P>当運営は、本サービスの利用により生じたいかなる損害についても、一切の責任を負いません。</P>
      <SectionTitle>4. 禁止事項</SectionTitle>
      <P>本サービスの内容を無断で複製・転載する行為、運営を妨害する行為は禁止します。</P>
    </div>
  );
}

function DisclaimerDetail() {
  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-4">免責事項</h2>
      <SectionTitle>1. 抽選結果の性質について</SectionTitle>
      <P>ナンバーズ3・ナンバーズ4の抽選は、完全にランダムな方法で行われます。過去の抽選結果は将来の結果に一切影響を与えません。</P>
      <SectionTitle>2. 統計分析について</SectionTitle>
      <P>本サービスの統計分析は、過去のデータの傾向を可視化するものであり、将来の当選番号を予測する能力を持つものではありません。</P>
      <SectionTitle>3. AI予測について</SectionTitle>
      <P>本サービスのAI予測は、LSTMニューラルネットワークを使用していますが、ランダムな抽選結果に対して機械学習が有効であることを示す科学的根拠はありません。</P>
      <SectionTitle>4. 占い機能について</SectionTitle>
      <P>本サービスの占い機能は、数秘術および六曜に基づくものです。これらは科学的に証明された方法ではなく、エンターテインメントとしてお楽しみいただくものです。</P>
      <SectionTitle>5. 推奨される利用方法</SectionTitle>
      <P>本サービスは、宝くじ購入の楽しみを広げるためのエンターテインメントツールとしてご利用ください。計画的な購入をお勧めします。</P>
    </div>
  );
}
