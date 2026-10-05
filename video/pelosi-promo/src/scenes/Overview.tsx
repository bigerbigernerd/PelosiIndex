import {AbsoluteFill, Interactive, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop,C,categories,Chrome,ease,graph,linear,mono,sans,Scan} from '../design';
import {GraphField} from '../GraphField';

export const Overview = () => {
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{fontFamily:sans,color:C.ink}}>
    <Backdrop /><GraphField />
    <AbsoluteFill style={{background:'linear-gradient(90deg,#070b0aee 0%,#070b0a99 19%,transparent 37%)'}} />
    <Chrome />
    <Interactive.Div name="Website hero" style={{position:'absolute',left:88,top:175,opacity:interpolate(frame,[2,24],[0,1],ease),translate:interpolate(frame,[2,24],['0px 18px','0px 0px'],ease)}}>
      <div style={{fontSize:16,fontFamily:mono,letterSpacing:4,color:C.green,marginBottom:26}}>LIVE DISCLOSURE GRAPH</div>
      <div style={{fontSize:84,fontWeight:700,lineHeight:1.2}}>谁在买，<br />谁在卖。</div>
      <div style={{fontSize:25,color:C.mute,marginTop:25,lineHeight:1.8}}>政客、CEO、基金与主权财富<br />在同一张图上。</div>
    </Interactive.Div>
    <Interactive.Div name="Verified dataset counts" style={{position:'absolute',left:88,top:536,display:'flex',gap:27,opacity:interpolate(frame,[25,45],[0,1],ease)}}>
      {[['主体',graph.stats.subjects],['股票',graph.stats.stocks],['关系',graph.stats.edges]].map(([label,value],i)=><div key={label} style={{borderLeft:`1px solid ${C.line}`,paddingLeft:18}}><div style={{fontSize:17,color:C.mute,marginBottom:13}}>{label}</div><div style={{fontFamily:mono,fontSize:i===2?38:46}}>{Math.round(interpolate(frame,[27,64],[0,Number(value)],ease)).toLocaleString('en-US')}</div></div>)}
    </Interactive.Div>
    <Interactive.Div name="Five disclosure categories" style={{position:'absolute',left:88,top:688,opacity:interpolate(frame,[48,70],[0,1],ease)}}>
      {graph.cats.map((cat,i)=><div key={cat.id} style={{display:'flex',alignItems:'center',gap:16,fontSize:22,marginTop:13}}><span style={{width:7,height:7,borderRadius:'50%',background:categories[i],boxShadow:`0 0 12px ${categories[i]}`}}/><span style={{color:C.mute}}>{cat.zh}</span><span style={{fontFamily:mono,fontSize:16,color:categories[i],marginLeft:8}}>{graph.stats.byCat[i]}</span></div>)}
    </Interactive.Div>
    <div style={{position:'absolute',right:90,top:162,fontFamily:mono,fontSize:17,color:C.green,opacity:interpolate(frame,[20,45],[0,1],ease)}}>● TOUR ON</div>
    <div style={{position:'absolute',right:90,bottom:98,display:'flex',gap:24,fontSize:16,fontFamily:mono,color:C.mute}}><span style={{color:C.green}}>— 增持 / 新建 / 买入</span><span style={{color:C.red}}>— 减持 / 清仓 / 卖出</span></div>
    <Scan />
    <AbsoluteFill style={{pointerEvents:'none',background:C.bg,opacity:interpolate(frame,[231,239],[0,.25],linear)}} />
  </AbsoluteFill>;
};
