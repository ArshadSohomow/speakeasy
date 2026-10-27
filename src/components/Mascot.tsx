import type { MascotId } from '../lib/types';

export type Mood = 'idle' | 'listening' | 'speaking' | 'happy' | 'thinking';

const INK = '#2A2E3A';

function Eyes({ l, r, mood, onDark = false, size = 5 }: { l: [number, number]; r: [number, number]; mood: Mood; onDark?: boolean; size?: number }) {
  if (mood === 'happy') {
    const arc = ([x, y]: [number, number]) => `M${x - 6} ${y + 2} Q${x} ${y - 6} ${x + 6} ${y + 2}`;
    return (
      <g className="m-eyes" stroke={onDark ? '#fff' : INK} strokeWidth={3.2} strokeLinecap="round" fill="none">
        <path d={arc(l)} /><path d={arc(r)} />
      </g>
    );
  }
  const dy = mood === 'thinking' ? -2.5 : 0;
  const dx = mood === 'thinking' ? 1.5 : 0;
  const s = mood === 'listening' ? size + 0.8 : size;
  const one = ([x, y]: [number, number], k: string) => (
    <g key={k}>
      {onDark && <circle cx={x} cy={y} r={s + 2.6} fill="#fff" />}
      <circle cx={x + dx} cy={y + dy} r={s} fill={INK} />
      <circle cx={x + dx + s * 0.35} cy={y + dy - s * 0.4} r={s * 0.34} fill="#fff" />
    </g>
  );
  return <g className="m-eyes">{one(l, 'l')}{one(r, 'r')}</g>;
}

function Mouth({ x, y, mood, w = 8, color = INK }: { x: number; y: number; mood: Mood; w?: number; color?: string }) {
  if (mood === 'speaking') {
    return (
      <g className="m-mouth-talk" style={{ transformOrigin: `${x}px ${y}px` }}>
        <ellipse cx={x} cy={y + 2} rx={w * 0.75} ry={5.5} fill="#5B2A33" />
        <ellipse cx={x} cy={y + 5} rx={w * 0.45} ry={2.2} fill="#F08C8C" />
      </g>
    );
  }
  if (mood === 'happy') return <path d={`M${x - w} ${y - 1} Q${x} ${y + 11} ${x + w} ${y - 1} Z`} fill="#5B2A33" />;
  if (mood === 'thinking') return <path d={`M${x - w * 0.6} ${y + 2} Q${x} ${y} ${x + w * 0.6} ${y + 2}`} stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" />;
  return <path d={`M${x - w} ${y} Q${x} ${y + 7} ${x + w} ${y}`} stroke={color} strokeWidth={2.8} fill="none" strokeLinecap="round" />;
}

const Blush = ({ l, r, color = '#FF9F8E', o = 0.45 }: { l: [number, number]; r: [number, number]; color?: string; o?: number }) => (
  <g opacity={o}><ellipse cx={l[0]} cy={l[1]} rx={7} ry={4.5} fill={color} /><ellipse cx={r[0]} cy={r[1]} rx={7} ry={4.5} fill={color} /></g>
);

function Theodore({ mood }: { mood: Mood }) {
  return (
    <>
      <ellipse cx="100" cy="196" rx="84" ry="44" fill="#B48552" />
      <path d="M36 196 Q100 150 164 196" fill="none" stroke="#9A6E40" strokeWidth="4" />
      <path d="M40 200 C42 168 66 152 100 152 C134 152 158 168 160 200Z" fill="#2E3550" />
      <path d="M84 153 L100 190 L116 153Z" fill="#F2CF6B" />
      <path d="M86 152 L100 168 L114 152Z" fill="#FBF8F0" />
      <circle cx="100" cy="176" r="2.2" fill="#9A7A2A" /><circle cx="100" cy="185" r="2.2" fill="#9A7A2A" />
      <path d="M84 152 L72 200 M116 152 L128 200" stroke="#232942" strokeWidth="3" />
      <g className="m-head">
        <path d="M80 134 Q100 158 120 134 L121 154 Q100 162 79 154Z" fill="#7FBE93" />
        <path d="M89 158 l11 -6 l11 6 l-11 6z" fill="#F08C7A" /><circle cx="100" cy="158" r="3" fill="#D4705E" />
        <ellipse cx="100" cy="104" rx="45" ry="40" fill="#9AD3AA" />
        <circle cx="74" cy="122" r="3" fill="#86C49A" /><circle cx="128" cy="86" r="2.5" fill="#86C49A" /><circle cx="122" cy="126" r="2" fill="#86C49A" />
        <Blush l={[72, 116]} r={[128, 116]} />
        <path d="M74 86 Q83 81 92 86 M108 86 Q117 81 126 86" stroke="#F4F1E8" strokeWidth="4" strokeLinecap="round" fill="none" />
        <Eyes l={[84, 101]} r={[116, 101]} mood={mood} size={4.5} />
        <g fill="#FFFFFF" fillOpacity="0.18" stroke={INK} strokeWidth="2.6">
          <circle cx="84" cy="101" r="12" /><circle cx="116" cy="101" r="12" />
        </g>
        <path d="M96 100 Q100 97 104 100" stroke={INK} strokeWidth="2.4" fill="none" />
        <Mouth x={100} y={122} mood={mood} w={9} />
        <g transform="rotate(-7 100 66)">
          <ellipse cx="100" cy="66" rx="40" ry="8" fill="#2B2F3A" />
          <rect x="73" y="20" width="54" height="46" rx="5" fill="#2B2F3A" />
          <rect x="73" y="52" width="54" height="8" fill="#B9AEF5" />
          <rect x="80" y="24" width="6" height="26" rx="3" fill="#3B4150" />
        </g>
      </g>
    </>
  );
}

function Milo({ mood }: { mood: Mood }) {
  return (
    <>
      <rect x="40" y="150" width="120" height="60" rx="26" fill="#E87A64" />
      <path d="M46 200 C48 170 70 156 100 156 C130 156 152 170 154 200Z" fill="#CDB27C" />
      <path d="M68 162 L74 200 M132 162 L126 200" stroke="#E87A64" strokeWidth="9" strokeLinecap="round" />
      <rect x="80" y="176" width="16" height="13" rx="3" fill="#B99B60" /><rect x="104" y="176" width="16" height="13" rx="3" fill="#B99B60" />
      <path d="M84 156 L100 172 L116 156Z" fill="#F08C7A" />
      <g className="m-head">
        <circle cx="54" cy="78" r="28" fill="#B7AFCB" /><circle cx="54" cy="78" r="17" fill="#FFB7A8" />
        <circle cx="146" cy="78" r="28" fill="#B7AFCB" /><circle cx="146" cy="78" r="17" fill="#FFB7A8" />
        <ellipse cx="100" cy="108" rx="44" ry="42" fill="#CFC9DD" />
        <ellipse cx="100" cy="126" rx="25" ry="17" fill="#ECE8F3" />
        <Blush l={[73, 120]} r={[127, 120]} />
        <Eyes l={[83, 103]} r={[117, 103]} mood={mood} size={5.2} />
        <ellipse cx="100" cy="117" rx="6.5" ry="5" fill="#EE8672" />
        <g stroke="#8E87A3" strokeWidth="1.6" strokeLinecap="round">
          <path d="M74 121 L56 117 M74 126 L57 129 M126 121 L144 117 M126 126 L143 129" />
        </g>
        <Mouth x={100} y={128} mood={mood} w={7} />
        <path d="M54 72 Q100 14 146 72Z" fill="#D9BF84" />
        <path d="M70 52 Q100 38 130 52" stroke="#C4A86B" strokeWidth="3" fill="none" />
        <ellipse cx="100" cy="72" rx="56" ry="9" fill="#C9AD70" />
        <rect x="58" y="62" width="84" height="7" rx="3" fill="#7F6A3C" />
        <circle cx="100" cy="30" r="4" fill="#C4A86B" />
      </g>
    </>
  );
}

function Kai({ mood }: { mood: Mood }) {
  return (
    <>
      <path d="M38 200 C40 166 66 150 100 150 C134 150 160 166 162 200Z" fill="#8FBBEB" />
      <ellipse cx="100" cy="152" rx="44" ry="15" fill="#76A6DC" />
      <path d="M90 160 L88 186 M110 160 L112 186" stroke="#FBFBF8" strokeWidth="3" strokeLinecap="round" />
      <circle cx="88" cy="188" r="3" fill="#FBFBF8" /><circle cx="112" cy="188" r="3" fill="#FBFBF8" />
      <path d="M62 148 Q100 176 138 148" stroke="#7FD1AE" strokeWidth="6" fill="none" strokeLinecap="round" />
      <rect x="52" y="138" width="16" height="22" rx="7" fill="#5FBF97" /><rect x="132" y="138" width="16" height="22" rx="7" fill="#5FBF97" />
      <g className="m-head">
        <circle cx="60" cy="64" r="17" fill="#2A2D36" /><circle cx="140" cy="64" r="17" fill="#2A2D36" />
        <circle cx="100" cy="102" r="48" fill="#FCFBF7" stroke="#E4E0D6" strokeWidth="2" />
        <ellipse cx="81" cy="100" rx="13" ry="16" transform="rotate(-28 81 100)" fill="#2A2D36" />
        <ellipse cx="119" cy="100" rx="13" ry="16" transform="rotate(28 119 100)" fill="#2A2D36" />
        <Blush l={[72, 124]} r={[128, 124]} />
        <Eyes l={[82, 99]} r={[118, 99]} mood={mood} onDark size={4} />
        <path d="M94 115 Q100 111 106 115 Q103 121 100 121 Q97 121 94 115Z" fill="#2A2D36" />
        <Mouth x={100} y={127} mood={mood} w={7} />
        <path d="M64 70 Q80 54 98 58" stroke="#2A2D36" strokeWidth="0" fill="none" />
      </g>
    </>
  );
}

function Ace({ mood }: { mood: Mood }) {
  return (
    <>
      <path d="M38 200 C40 166 66 150 100 150 C134 150 160 166 162 200Z" fill="#E8735C" />
      <path d="M78 156 L70 200 M90 153 L84 200" stroke="#FBF8F0" strokeWidth="5" />
      <path d="M78 150 Q100 166 122 150 L122 160 Q100 174 78 160Z" fill="#2B2F3A" />
      <path d="M118 176 l8 -6 l8 6 l-8 6z" fill="#F7D986" />
      <path d="M128 168 L156 168" stroke="#C85A45" strokeWidth="0" />
      <g className="m-head">
        <path d="M78 140 Q100 158 122 140 L120 156 Q100 164 80 156Z" fill="#F4F1EA" />
        <path d="M56 106 C54 70 74 48 100 48 C126 48 146 70 144 106 C142 132 124 146 100 146 C76 146 58 132 56 106Z" fill="#FBFAF6" stroke="#E4E0D6" strokeWidth="2" />
        <path d="M70 58 L76 40 L86 54 L94 36 L102 52 L112 38 L116 56 L128 46 L128 62Z" fill="#FBFAF6" stroke="#E4E0D6" strokeWidth="2" strokeLinejoin="round" />
        <Blush l={[72, 116]} r={[128, 116]} o={0.35} />
        <path d="M73 88 L92 92 M127 88 L108 92" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
        <Eyes l={[83, 100]} r={[117, 100]} mood={mood} size={5} />
        <path d="M86 110 Q100 102 114 110 Q116 124 104 136 Q106 126 100 122 Q92 120 86 110Z" fill="#F2B13C" />
        <path d="M90 112 Q100 108 110 112" stroke="#D99520" strokeWidth="1.6" fill="none" />
        {mood === 'speaking' ? <ellipse className="m-mouth-talk" cx="100" cy="124" rx="6" ry="3.5" fill="#5B2A33" style={{ transformOrigin: '100px 124px' }} /> : null}
        <rect x="56" y="64" width="88" height="9" rx="4.5" fill="#2B2F3A" />
        <rect x="68" y="58" width="28" height="20" rx="8" fill="#C8E1FF" stroke="#2B2F3A" strokeWidth="3.5" />
        <rect x="104" y="58" width="28" height="20" rx="8" fill="#C8E1FF" stroke="#2B2F3A" strokeWidth="3.5" />
        <path d="M74 63 l6 0 M110 63 l6 0" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </>
  );
}

function Sterling({ mood }: { mood: Mood }) {
  return (
    <>
      <path d="M36 200 C38 166 64 150 100 150 C136 150 162 166 164 200Z" fill="#373D51" />
      <path d="M82 151 L100 200 L118 151Z" fill="#FBF8F0" />
      <path d="M95 160 L100 156 L105 160 L103 190 L100 196 L97 190Z" fill="#9C8FE6" />
      <path d="M82 151 L92 178 L78 172 L70 156Z M118 151 L108 178 L122 172 L130 156Z" fill="#2B3042" />
      <path d="M130 176 L144 176 L137 168Z" fill="#B9AEF5" />
      <circle cx="74" cy="168" r="2.6" fill="#E5C25A" />
      <g className="m-head">
        <circle cx="62" cy="68" r="16" fill="#F2A35A" /><circle cx="62" cy="68" r="8" fill="#FBE6CF" />
        <circle cx="138" cy="68" r="16" fill="#F2A35A" /><circle cx="138" cy="68" r="8" fill="#FBE6CF" />
        <path d="M84 136 Q100 154 116 136 L116 152 Q100 158 84 152Z" fill="#E8964B" />
        <ellipse cx="100" cy="104" rx="50" ry="44" fill="#F2A35A" />
        <g fill="#3A2E2E">
          <path d="M100 62 L94 76 L100 80 L106 76Z" />
          <path d="M84 66 L82 78 L88 78Z" /><path d="M116 66 L118 78 L112 78Z" />
          <path d="M51 100 L66 104 L52 108Z" /><path d="M53 114 L66 114 L56 120Z" />
          <path d="M149 100 L134 104 L148 108Z" /><path d="M147 114 L134 114 L144 120Z" />
        </g>
        <ellipse cx="88" cy="122" rx="15" ry="12" fill="#FFF6EC" /><ellipse cx="112" cy="122" rx="15" ry="12" fill="#FFF6EC" />
        <ellipse cx="100" cy="132" rx="11" ry="8" fill="#FFF6EC" />
        <Eyes l={[82, 99]} r={[118, 99]} mood={mood} size={5} />
        {mood !== 'happy' && <path d="M74 92 Q82 89 90 92 M110 92 Q118 89 126 92" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />}
        <path d="M93 113 L107 113 L100 121Z" fill="#C8665A" />
        <Mouth x={100} y={127} mood={mood} w={7} />
      </g>
    </>
  );
}

const BG: Record<MascotId, string> = { theodore: 'var(--mint)', milo: 'var(--coral)', kai: 'var(--sky)', ace: 'var(--yellow)', sterling: 'var(--lavender)' };

export function Mascot({ id, mood = 'idle', size = 120, bg = true, className = '', title }: { id: MascotId; mood?: Mood; size?: number; bg?: boolean; className?: string; title?: string }) {
  const Art = { theodore: Theodore, milo: Milo, kai: Kai, ace: Ace, sterling: Sterling }[id];
  return (
    <svg className={`mascot mood-${mood} ${className}`} viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={title ?? `${id} mascot`}>
      {bg && <circle cx="100" cy="100" r="100" fill={BG[id]} />}
      <defs><clipPath id={`clip-${id}`}><circle cx="100" cy="100" r="100" /></clipPath></defs>
      <g clipPath={bg ? `url(#clip-${id})` : undefined}>
        <Art mood={mood} />
      </g>
    </svg>
  );
}
