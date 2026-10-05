import {AbsoluteFill, Interactive, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop,Brand,C,ease,linear,mono,sans} from '../design';
import {GraphField} from '../GraphField';

export const Closing = () => {
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{fontFamily:sans,color:C.ink}}>
    <Backdrop /><GraphField mode="ambient" opacity={.24}/>
    <AbsoluteFill style={{background:'radial-gradient(ellipse at center,#070b0aee 0%,#070b0a99 45%,transparent 80%)'}} />
    <Interactive.Div name="Closing brand" style={{position:'absolute',top:244,width:'100%',textAlign:'center',opacity:interpolate(frame,[0,25],[0,1],ease),scale:interpolate(frame,[0,60],[.87,1],{...ease,output:'perceptual-scale'}),textShadow:'0 0 70px #3ee08f22'}}><Brand size={178} /></Interactive.Div>
    <Interactive.Div name="Closing website name" style={{position:'absolute',top:463,width:'100%',textAlign:'center',fontSize:98,letterSpacing:10,fontWeight:700,opacity:interpolate(frame,[9,35],[0,1],ease)}}>佩洛西指数</Interactive.Div>
    <Interactive.Div name="Website URL" style={{position:'absolute',top:650,width:'100%',textAlign:'center',fontFamily:mono,fontSize:44,letterSpacing:2,color:C.green,opacity:interpolate(frame,[24,47],[0,1],ease)}}>pelosi.pocketplay.win<span style={{fontSize:34,marginLeft:23}}>↗</span></Interactive.Div>
    <Interactive.Div name="Open-source repository" style={{position:'absolute',top:765,width:'100%',textAlign:'center',fontFamily:mono,fontSize:23,color:C.mute,opacity:interpolate(frame,[40,63],[0,1],ease)}}>OPEN SOURCE · github.com/bigerbigernerd/PelosiIndex</Interactive.Div>
    <AbsoluteFill style={{background:C.bg,opacity:interpolate(frame,[111,119],[0,1],linear)}} />
  </AbsoluteFill>;
};
