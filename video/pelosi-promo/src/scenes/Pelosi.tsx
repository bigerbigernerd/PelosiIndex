import {AbsoluteFill, Interactive, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop,C,Chrome,ease,graph,linear,mono,OrbitLine,pelosi,pelosiFilings,sans,Scan,Sprite} from '../design';

const stockIds=['BE','INTC','NVDA','AMZN','GOOGL','AAPL','AVGO','PANW'];
const si=graph.S.findIndex(s=>s.id===pelosi.id);
const satellites=stockIds.map((t,i)=>{
  const stock=graph.T.find(s=>s.t===t)!;
  const ti=graph.T.indexOf(stock);const edge=graph.E.find(e=>e[0]===si&&e[1]===ti)!;
  const a=(i/stockIds.length)*Math.PI*2-Math.PI/2;
  return {...stock,x:555+Math.cos(a)*350,y:584+Math.sin(a)*300,color:graph.kinds[edge[2]]==='mixed'?C.gold:C.green};
});
const latest=pelosiFilings.filings.find(f=>f.doc_id==='20035143')!;
const selected=[latest.rows.find(r=>r.id==='house-20035143-3')!,latest.rows.find(r=>r.id==='house-20035143-2')!,latest.rows.find(r=>r.id==='house-20035143-5')!];

export const PelosiScene = () => {
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{fontFamily:sans,color:C.ink}}>
    <Backdrop /><Chrome page="人物" section="HOUSE PTR" />
    <div style={{position:'absolute',left:88,top:163,fontFamily:mono,fontSize:18,color:C.red,letterSpacing:3}}>01 / SUBJECT DETAIL</div>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0}}>
      <ellipse cx="555" cy="584" rx="350" ry="300" stroke={C.line} fill="none" strokeDasharray="2 12" />
      {satellites.map((n,i)=><OrbitLine key={n.t} x1={555} y1={584} x2={n.x} y2={n.y} color={n.color} frame={frame} delay={i*4+8} phase={i*.171} />)}
      {[115,137,166].map((r,i)=><circle key={r} cx="555" cy="584" r={r+Math.sin(frame/24)*3} stroke={C.red} fill="none" opacity={.4-i*.12} strokeWidth={i===0?2:.7} />)}
    </svg>
    <Interactive.Div name="Pelosi portrait" style={{position:'absolute',left:465,top:494,scale:interpolate(frame,[0,32],[.6,1],{...ease,output:'perceptual-scale'}),opacity:interpolate(frame,[0,18],[0,1],ease)}}><Sprite img={pelosi.img} size={180} color={C.red} /></Interactive.Div>
    <div style={{position:'absolute',left:355,top:746,width:400,textAlign:'center',fontSize:40}}>南希·佩洛西</div>
    {satellites.map((n,i)=><Interactive.Div key={n.t} name={`${n.t} disclosed connection`} style={{position:'absolute',left:n.x-40,top:n.y-40,width:80,opacity:interpolate(frame,[i*4+12,i*4+32],[0,1],ease),scale:interpolate(frame,[i*4+12,i*4+40],[.4,1],{...ease,output:'perceptual-scale'})}}><Sprite img={n.img} size={80} color={n.color} /><div style={{fontFamily:mono,fontSize:26,textAlign:'center',marginTop:11}}>{n.t}</div></Interactive.Div>)}
    <Interactive.Div name="Source-backed disclosure drawer" style={{position:'absolute',left:1010,top:202,width:822,border:`1px solid ${C.line}`,background:'#0b1411ee',padding:42,boxShadow:'0 25px 100px #0008',opacity:interpolate(frame,[30,58],[0,1],ease),translate:interpolate(frame,[30,64],['120px 0px','0px 0px'],ease)}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${C.line}`,paddingBottom:26}}><div><div style={{fontFamily:mono,fontSize:17,letterSpacing:3,color:C.red,marginBottom:14}}>PUBLIC DISCLOSURE / PTR</div><div style={{fontSize:46}}>披露详情</div></div><span style={{color:C.mute,fontSize:36}}>↗</span></div>
      <div style={{display:'flex',gap:46,padding:'26px 0',fontSize:21,color:C.mute}}><span><b style={{color:C.ink,fontFamily:mono,fontSize:34}}>{pelosiFilings.filings.length}</b> 份报告</span><span><b style={{color:C.ink,fontFamily:mono,fontSize:34}}>{pelosiFilings.filings.reduce((n,f)=>n+f.rows.length,0)}</b> 条交易</span><span style={{color:C.gold,marginLeft:'auto',alignSelf:'center'}}>SP · 配偶</span></div>
      {selected.map((r,i)=><div key={r.id} style={{borderTop:`1px solid ${C.line}`,padding:'23px 0',opacity:interpolate(frame,[63+i*15,83+i*15],[0,1],ease),translate:interpolate(frame,[63+i*15,83+i*15],['0px 14px','0px 0px'],ease)}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontFamily:mono,fontSize:33}}>{r.ticker}<span style={{fontFamily:sans,fontSize:18,color:C.mute,marginLeft:18}}>{r.asset_type==='OP'?'期权':'股票'}</span></span><span style={{fontSize:19,color:C.green,border:`1px solid ${C.green}66`,padding:'3px 13px'}}>买入</span></div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:14,fontFamily:mono,fontSize:20,color:C.mute}}><span>{r.transaction_date}</span><span style={{color:C.ink}}>{r.amount_raw}</span></div>
      </div>)}
      <div style={{borderTop:`1px solid ${C.line}`,paddingTop:24,fontSize:18,color:C.mute,lineHeight:1.9}}><span style={{color:C.green}}>来源 ↗ 众议院书记官原件</span><br/><span style={{fontFamily:mono}}>20035143.pdf · p.1 · Filed 2026-08-21</span><br/>金额为申报区间；保留配偶与期权标记。</div>
    </Interactive.Div>
    <Scan color={C.red} />
    <AbsoluteFill style={{pointerEvents:'none',background:C.bg,opacity:interpolate(frame,[232,239],[0,.25],linear)}} />
  </AbsoluteFill>;
};
