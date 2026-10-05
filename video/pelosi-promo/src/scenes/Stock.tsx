import {AbsoluteFill, Interactive, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop,C,categories,Chrome,ease,graph,linear,mono,nvdaHolders,OrbitLine,sans,Scan,Sprite} from '../design';

const ticker=graph.T.find(t=>t.t==='NVDA')!;
const ids=['house-p000197','jensen-huang','bridgewater','renaissance','citadel','norges','temasek','cppib','harvard','soros','appaloosa','two-sigma'];
const holders=ids.map(id=>graph.S.findIndex(s=>s.id===id)).filter(i=>i>=0&&nvdaHolders.some(h=>Number(h[0])===i)).map(i=>({subject:graph.S[i],row:nvdaHolders.find(h=>Number(h[0])===i)!}));
const byCat=graph.cats.map((_,i)=>nvdaHolders.filter(h=>graph.S[Number(h[0])].c===i).length);

export const StockScene = () => {
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{fontFamily:sans,color:C.ink}}>
    <Backdrop /><Chrome page="股票" section="REVERSE LOOKUP" />
    <Interactive.Div name="Stock lookup header" style={{position:'absolute',left:88,top:160,opacity:interpolate(frame,[0,18],[0,1],ease)}}><div style={{fontFamily:mono,fontSize:18,letterSpacing:3,color:C.blue,marginBottom:20}}>02 / STOCK DETAIL</div><div style={{fontSize:63}}>谁披露过 NVDA？</div></Interactive.Div>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0}}>
      <ellipse cx="960" cy="590" rx="730" ry="278" fill="none" stroke={C.line} strokeDasharray="2 14" />
      {holders.map((h,i)=>{
        const a=i/holders.length*Math.PI*2-Math.PI/2;const x=960+Math.cos(a)*730,y=590+Math.sin(a)*278;
        const kind=graph.kinds[Number(h.row[1])];const color=['trim','sell','exit'].includes(kind)?C.red:['add','buy','new'].includes(kind)?C.green:C.mute;
        return <OrbitLine key={h.subject.id} x1={960} y1={590} x2={x} y2={y} color={color} frame={frame} delay={8+i*3} phase={i*.173} />;
      })}
      {byCat.map((n,i)=>n>0?<circle key={i} cx="960" cy="590" r="128" fill="none" stroke={categories[i]} strokeWidth="5" strokeDasharray="143 661" strokeDashoffset={-i*161} style={{rotate: `${-90+frame*.08}deg`,transformOrigin:'960px 590px'}}/>:null)}
      <circle cx="960" cy="590" r="156" fill="none" stroke={C.line} />
    </svg>
    <Interactive.Div name="NVDA center" style={{position:'absolute',left:858,top:488,scale:interpolate(frame,[0,26],[.6,1],{...ease,output:'perceptual-scale'}),opacity:interpolate(frame,[0,18],[0,1],ease)}}><Sprite img={ticker.img} size={204} /></Interactive.Div>
    <div style={{position:'absolute',top:765,left:745,width:430,textAlign:'center',color:C.mute,fontSize:26,lineHeight:1.4}}>{nvdaHolders.length} 个公开披露主体</div>
    {holders.map((h,i)=>{
      const a=i/holders.length*Math.PI*2-Math.PI/2;const x=960+Math.cos(a)*730,y=590+Math.sin(a)*278;
      return <Interactive.Div key={h.subject.id} name={`${h.subject.n} NVDA disclosure`} style={{position:'absolute',left:x-46,top:y-46,width:92,opacity:interpolate(frame,[i*3+15,i*3+34],[0,1],ease),scale:interpolate(frame,[i*3+15,i*3+39],[.5,1],{...ease,output:'perceptual-scale'})}}><Sprite img={h.subject.img} size={92} color={categories[h.subject.c]} /><div style={{position:'absolute',top:104,left:-94,width:280,textAlign:'center',fontSize:24}}>{h.subject.n}</div></Interactive.Div>;
    })}
    <div style={{position:'absolute',right:88,top:172,display:'flex',gap:24,opacity:interpolate(frame,[25,45],[0,1],ease)}}>{byCat.map((n,i)=>n?<div key={i} style={{color:categories[i],fontFamily:mono,fontSize:30}}>{n}<div style={{fontFamily:sans,color:C.mute,fontSize:16,marginTop:8}}>{graph.cats[i].zh.split('·')[0]}</div></div>:null)}</div>
    <Scan color={C.blue} /><AbsoluteFill style={{pointerEvents:'none',background:C.bg,opacity:interpolate(frame,[172,179],[0,.3],linear)}} />
  </AbsoluteFill>;
};
