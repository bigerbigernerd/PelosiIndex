import {AbsoluteFill, CanvasImage, staticFile} from 'remotion';
import {Backdrop,Brand,C,graph,mono,sans,Sprite} from './design';
import {GraphField} from './GraphField';

const nodes=[
  {ticker:'GOOGL',x:1150,y:180,size:106},
  {ticker:'NVDA',x:1740,y:265,size:126},
  {ticker:'AAPL',x:1765,y:805,size:108},
  {ticker:'AMZN',x:1140,y:865,size:112},
];

export const YouTubeCover=()=> <AbsoluteFill style={{fontFamily:sans,color:C.ink,overflow:'hidden'}}>
  <Backdrop />
  <GraphField mode="ambient" opacity={.24}/>
  <AbsoluteFill style={{background:'linear-gradient(90deg,#060c09 0%,#060c09f5 38%,#060c0960 70%,#060c0910 100%)'}}/>
  <div style={{position:'absolute',left:96,top:85,display:'flex',gap:30,alignItems:'center'}}><Brand size={78}/><span style={{fontSize:42,fontWeight:700,letterSpacing:2}}>PELOSI INDEX</span></div>
  <div style={{position:'absolute',left:94,top:267,fontSize:170,lineHeight:1,fontWeight:700,letterSpacing:-7}}>WHO&apos;S</div>
  <div style={{position:'absolute',left:88,top:440,fontSize:212,lineHeight:1.05,fontWeight:700,letterSpacing:-11,color:C.green,textShadow:'0 0 70px #3ee08f22'}}>BUYING?</div>
  <div style={{position:'absolute',left:99,top:743,width:745,height:2,background:`linear-gradient(90deg,${C.green},#3ee08f00)`}}/>
  <div style={{position:'absolute',left:98,top:796,fontSize:33,fontFamily:mono,letterSpacing:4,color:'#b4bdb7'}}>PUBLIC FILINGS. CONNECTED.</div>
  <svg width="1920" height="1080" style={{position:'absolute',inset:0}}>
    <circle cx="1440" cy="535" r="258" fill="none" stroke={C.green} strokeWidth="1.5" opacity=".24"/>
    <circle cx="1440" cy="535" r="296" fill="none" stroke={C.green} strokeWidth="1" strokeDasharray="2 14" opacity=".25"/>
    {nodes.map(n=><g key={n.ticker}><line x1="1440" y1="535" x2={n.x} y2={n.y} stroke={C.green} strokeWidth="2" opacity=".52"/><circle cx={1440+(n.x-1440)*.67} cy={535+(n.y-535)*.67} r="5" fill={C.green}/></g>)}
  </svg>
  <div style={{position:'absolute',left:1224,top:319,width:432,height:432,borderRadius:'50%',overflow:'hidden',border:`4px solid ${C.green}`,boxShadow:'0 0 100px #3ee08f35, 0 22px 100px #0009',background:C.bg}}>
    <CanvasImage src={staticFile('youtube/nancy-pelosi.jpg')} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 22%',filter:'saturate(.45) contrast(1.06)'}}/>
  </div>
  <div style={{position:'absolute',left:1265,top:777,width:350,textAlign:'center',fontSize:30,fontWeight:600,color:'#c3cec5',letterSpacing:1}}>NANCY PELOSI</div>
  {nodes.map(n=>{
    const stock=graph.T.find(t=>t.t===n.ticker)!;
    return <div key={n.ticker} style={{position:'absolute',left:n.x-n.size/2,top:n.y-n.size/2,width:n.size,display:'flex',alignItems:'center',flexDirection:'column'}}><Sprite img={stock.img} size={n.size}/><div style={{fontFamily:mono,fontSize:29,marginTop:12,color:C.ink}}>{n.ticker}</div></div>;
  })}
  <div style={{position:'absolute',left:96,bottom:73,fontFamily:mono,fontSize:24,letterSpacing:2,color:C.mute}}>pelosi.pocketplay.win</div>
</AbsoluteFill>;
