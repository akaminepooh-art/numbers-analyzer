interface NumerologyBase {
  systemName: string;
  systemTitle: string;
  element: string;
  description: string;
  color: string;
  emoji: string;
  coreNumbers: number[];
}

const PROFILES: Record<number, NumerologyBase> = {
  1: {
    systemName: '先駆者',
    systemTitle: '始まりの数字に導かれる者',
    element: '火',
    description: 'リーダーシップと独立心に溢れ、新しい道を切り開く力を持っています。1の位が1や0の番号、先頭寄りの数字との相性が抜群です。',
    color: '#EF4444',
    emoji: '🔥',
    coreNumbers: [1, 10, 19],
  },
  2: {
    systemName: '調和者',
    systemTitle: '対の数字が幸運を呼ぶ者',
    element: '水',
    description: '協調性と直感力に優れ、バランスを取る才能があります。偶数やペアになりやすい番号が幸運を運びます。',
    color: '#3B82F6',
    emoji: '💧',
    coreNumbers: [2, 11, 20],
  },
  3: {
    systemName: '創造者',
    systemTitle: '三位一体の力を持つ者',
    element: '風',
    description: '創造性と表現力に恵まれ、周囲を明るくする存在です。3の倍数や中央値付近の番号との縁が深いです。',
    color: '#F59E0B',
    emoji: '🌪️',
    coreNumbers: [3, 12, 21],
  },
  4: {
    systemName: '建設者',
    systemTitle: '堅実な数字が味方する者',
    element: '地',
    description: '安定と秩序を重んじ、確実に物事を積み上げる力があります。4の倍数や安定した中間帯の番号が味方します。',
    color: '#78716C',
    emoji: '🏔️',
    coreNumbers: [4, 13, 22],
  },
  5: {
    systemName: '冒険者',
    systemTitle: '変化の波に乗る者',
    element: '風',
    description: '自由と変化を愛し、予測不能な展開に強い運を持っています。素数や散らばった番号の組合せが吉です。',
    color: '#06B6D4',
    emoji: '🌊',
    coreNumbers: [5, 14, 23],
  },
  6: {
    systemName: '守護者',
    systemTitle: '調和の数字に愛される者',
    element: '水',
    description: '愛情深く責任感が強く、周囲を守る力があります。6の倍数やバランスの取れた組合せとの相性が良いです。',
    color: '#EC4899',
    emoji: '🛡️',
    coreNumbers: [6, 15, 24],
  },
  7: {
    systemName: '探究者',
    systemTitle: '神秘の数字と共鳴する者',
    element: '光',
    description: '深い洞察力と分析力を持ち、隠れたパターンを見抜きます。素数や7の倍数との共鳴が強いです。',
    color: '#8B5CF6',
    emoji: '🔮',
    coreNumbers: [7, 14, 21],
  },
  8: {
    systemName: '支配者',
    systemTitle: '大きな数字を引き寄せる者',
    element: '地',
    description: '豊かさと権威の運を持ち、大きな成功を引き寄せます。8の倍数や上位帯の番号が味方します。',
    color: '#D97706',
    emoji: '👑',
    coreNumbers: [8, 17, 26],
  },
  9: {
    systemName: '完成者',
    systemTitle: '全てを包む数字の達人',
    element: '火',
    description: '寛容さと叡智を持ち、全体を見渡す力があります。9の倍数や幅広い範囲からバランスよく選ばれた番号と縁があります。',
    color: '#DC2626',
    emoji: '🌟',
    coreNumbers: [9, 18, 27],
  },
  11: {
    systemName: '直感者',
    systemTitle: '見えない流れを読む者',
    element: '光',
    description: 'マスターナンバー11を持つあなたは、常人には見えない数字の流れを感じ取れます。11の倍数やゾロ目系の番号に強い縁があります。',
    color: '#A855F7',
    emoji: '✨',
    coreNumbers: [11, 22, 33],
  },
  22: {
    systemName: '大建築者',
    systemTitle: '大きな運命を動かす者',
    element: '地',
    description: 'マスターナンバー22を持つあなたは、壮大なビジョンを現実化する力があります。22の倍数や上位の大物番号が味方します。',
    color: '#B45309',
    emoji: '🏛️',
    coreNumbers: [22, 11, 33],
  },
  33: {
    systemName: '大奉仕者',
    systemTitle: '全ての数字に愛される者',
    element: '光',
    description: 'マスターナンバー33を持つあなたは、全ての数字から愛される特別な存在です。全範囲から満遍なく幸運が訪れます。',
    color: '#E879F9',
    emoji: '💎',
    coreNumbers: [33, 11, 22],
  },
};

export function getNumerologyProfile(lifePath: number): NumerologyBase {
  return PROFILES[lifePath] || PROFILES[digitalRoot(lifePath)] || PROFILES[1];
}

function digitalRoot(n: number): number {
  if (n === 11 || n === 22 || n === 33) return n;
  while (n >= 10) {
    n = String(n).split('').reduce((sum, d) => sum + parseInt(d), 0);
    if (n === 11 || n === 22 || n === 33) return n;
  }
  return n;
}
