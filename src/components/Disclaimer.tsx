import { NumbersGameConfig, PageId } from '../lib/types';

interface Props {
  config: NumbersGameConfig;
  onNavigate?: (page: PageId) => void;
}

export default function Disclaimer({ config, onNavigate }: Props) {
  return (
    <div className="glass rounded-lg px-4 py-3 text-sm text-text-secondary">
      <span className="font-bold">⚠ 免責事項:</span>{' '}
      {config.name}の抽選は完全にランダムです。本アプリの分析・予測は娯楽目的であり、当選を保証するものではありません。
      {onNavigate && (
        <div className="mt-2">
          <button
            onClick={() => onNavigate('legal')}
            className="text-accent hover:underline font-bold"
          >
            プライバシーポリシー・利用規約 →
          </button>
        </div>
      )}
    </div>
  );
}
