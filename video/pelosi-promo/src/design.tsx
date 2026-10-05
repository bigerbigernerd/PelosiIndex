import {AbsoluteFill, CanvasImage, Easing, Interactive, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
import data from './data/graph.json';
import holders from './data/holders.json';
import disclosures from './data/pelosi.json';

loadFont({family: 'JetBrains', url: staticFile('fonts/jetbrains-mono.woff2'), weight: '400'});
loadFont({family: 'NotoVideo', url: staticFile('fonts/noto-cjk.ttc'), format: 'truetype', weight: '400'});

export const graph = data;
export const nvdaHolders = holders.tickers.NVDA.h;
export const pelosi = graph.S.find((s) => s.id === 'house-p000197')!;
export const pelosiFilings = disclosures;
export const C = {bg: '#070b0a', ink: '#e8e6dc', mute: '#9aa69f', line: '#23372f', green: '#3ee08f', red: '#ff6a4d', gold: '#f4b740', blue: '#45c6ff', purple: '#b18cff'};
export const categories = [C.red, C.gold, C.green, C.blue, C.purple];
export const mono = 'JetBrains, monospace';
export const sans = 'NotoVideo, sans-serif';
export const ease = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)} as const;
export const linear = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const Sprite = ({img, size, color = C.green}: {img: number; size: number; color?: string}) => <div style={{width: size, height: size, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${color}`, background: C.bg, boxShadow: `0 0 30px ${color}33`, flexShrink: 0}}>
  {img >= 0 && <CanvasImage src={staticFile(`img/sprite-${img}.png`)} style={{width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated'}} />}
</div>;

export const Brand = ({size = 42}: {size?: number}) => <span style={{fontFamily: mono, fontSize: size, lineHeight: 1, fontWeight: 600, letterSpacing: '-.05em', color: C.ink}}>PI<span style={{color: C.green}}>//</span></span>;

export const Backdrop = () => <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
  <AbsoluteFill style={{background: 'radial-gradient(ellipse at 56% 58%, #11241c 0%, #0b1411 35%, #070b0a 75%)'}} />
  <AbsoluteFill style={{backgroundImage: 'linear-gradient(#5ca98708 1px, transparent 1px), linear-gradient(90deg, #5ca98708 1px, transparent 1px)', backgroundSize: '80px 80px', maskImage: 'radial-gradient(ellipse, #000, transparent 80%)'}} />
  <AbsoluteFill style={{backgroundImage: `url("${staticFile('img/grain.png')}")`, opacity: .036, mixBlendMode: 'screen'}} />
</AbsoluteFill>;

export const Chrome = ({page = '关系图', section = 'DISCLOSURE GRAPH'}: {page?: string; section?: string}) => <>
  <div style={{position: 'absolute', left: 80, right: 80, top: 52, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}`, paddingBottom: 24}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 18}}><Brand /><span style={{fontSize: 26, color: C.ink}}>佩洛西指数</span><span style={{fontFamily: mono, fontSize: 14, color: C.mute, marginLeft: 14, letterSpacing: 3}}>{section}</span></div>
    <div style={{display: 'flex', gap: 36, fontSize: 21}}>{['关系图', '人物', '股票', 'Skills'].map((p) => <span key={p} style={{color: p === page ? C.green : C.mute}}>{p}</span>)}</div>
  </div>
  <div style={{position: 'absolute', left: 80, bottom: 44, display: 'flex', alignItems: 'center', gap: 14, fontSize: 15, fontFamily: mono, letterSpacing: 2, color: C.mute}}><span style={{width: 5, height: 5, borderRadius: '50%', background: C.green, boxShadow: `0 0 10px ${C.green}`}} />PUBLIC DISCLOSURES<span style={{opacity: .4}}> / </span>SNAPSHOT 2026.10.04</div>
  <div style={{position: 'absolute', right: 80, bottom: 44, fontSize: 15, fontFamily: mono, color: C.mute}}>pelosi.pocketplay.win</div>
</>;

export const Scan = ({color = C.green}: {color?: string}) => {
  const frame = useCurrentFrame();
  return <Interactive.Div name="Entry scan" style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: interpolate(frame, [0, 4, 17], [0, .24, 0], linear), background: `linear-gradient(90deg, transparent 40%, ${color}66 50%, transparent 60%)`, translate: interpolate(frame, [0, 17], ['-1500px 0px', '1500px 0px'], linear)}} />;
};

export const OrbitLine = ({x1,y1,x2,y2,color,frame,delay = 0,phase = 0}: {x1:number;y1:number;x2:number;y2:number;color:string;frame:number;delay?:number;phase?:number}) => {
  const progress = interpolate(frame, [delay, delay+35], [0, 1], ease);
  const t = ((frame / 72 + phase) % 1);
  return <g opacity={progress}>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.2" opacity=".45" pathLength="1" strokeDasharray="1" strokeDashoffset={1-progress} />
    <circle cx={x1+(x2-x1)*t} cy={y1+(y2-y1)*t} r="4" fill={color} style={{filter:`drop-shadow(0 0 7px ${color})`}} />
  </g>;
};
