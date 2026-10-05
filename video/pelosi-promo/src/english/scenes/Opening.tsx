import {AbsoluteFill, Interactive, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop, Brand, C, ease, linear, mono, sans} from '../design';

export const EnglishOpening = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{fontFamily:sans,color:C.ink}}>
    <Backdrop />
    <svg width="1920" height="1080" style={{position:'absolute',inset:0,opacity:.45}}>
      {Array.from({length:6},(_,i)=><circle key={i} cx="960" cy="490" r={160+i*85+interpolate(frame,[0,120],[0,35],linear)} fill="none" stroke={i===0?C.green:'#32533f'} strokeWidth={i===0?1.5:.6} opacity={interpolate(frame,[i*5,i*5+25],[0,.4],ease)} />)}
      {Array.from({length:32},(_,i)=>{const a=i/32*Math.PI*2;const r=490+Math.sin(i*3.1)*110;return <g key={i} opacity={interpolate(frame,[i%10*4,70],[0,.7],ease)}><line x1={960+Math.cos(a)*230} y1={490+Math.sin(a)*230} x2={960+Math.cos(a)*r} y2={490+Math.sin(a)*r} stroke={i%3===0?C.green:'#345848'} strokeWidth=".6"/><circle cx={960+Math.cos(a)*r} cy={490+Math.sin(a)*r} r="3" fill={i%3===0?C.green:C.mute}/></g>;})}
    </svg>
    <Interactive.Div name="PI brand reveal" style={{position:'absolute',top:290,width:'100%',textAlign:'center',opacity:interpolate(frame,[5,32],[0,1],ease),scale:interpolate(frame,[5,60],[.7,1],{...ease,output:'perceptual-scale'}),textShadow:'0 0 70px #3ee08f44'}}><Brand size={220} /></Interactive.Div>
    <Interactive.Div name="Website identity" style={{position:'absolute',top:548,width:'100%',textAlign:'center',fontSize:106,fontWeight:700,letterSpacing:4,opacity:interpolate(frame,[30,60],[0,1],ease),translate:interpolate(frame,[30,60],['0px 30px','0px 0px'],ease)}}>PELOSI INDEX</Interactive.Div>
    <Interactive.Div name="English identity" style={{position:'absolute',top:730,width:'100%',textAlign:'center',fontSize:24,fontFamily:mono,letterSpacing:9,color:C.mute,opacity:interpolate(frame,[48,72],[0,1],ease)}}>DISCLOSURE GRAPH / OPEN RESEARCH</Interactive.Div>
    <Interactive.Div name="EnglishOpening light sweep" style={{position:'absolute',top:507,left:420,height:2,width:1080,background:`linear-gradient(90deg,transparent,${C.green},transparent)`,scale:interpolate(frame,[12,44],[0,1],ease),opacity:interpolate(frame,[12,40,80,119],[0,.9,.6,0],linear),boxShadow:`0 0 24px ${C.green}`}} />
    <AbsoluteFill style={{background:C.bg,opacity:interpolate(frame,[105,119],[0,1],linear)}} />
  </AbsoluteFill>;
};
