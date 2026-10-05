import {AbsoluteFill, Interactive, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop,C,categories,Chrome,ease,linear,mono,sans,Scan} from '../design';

const skills=[['SEC 13F','13F quarter comparison','sec-13f-diff'],['HOUSE PTR','Congressional trades','congress-ptr-reader'],['SEC FORM 4','Insider transactions','form4-insider-tracker'],['OPEN JSON','Public graph data','pelosi-graph-data'],['REPORT','Disclosure research','disclosure-research'],['CONTRIBUTE','Data contribution','pelosi-data-contributor']];

export const EnglishSkillsScene = () => {
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{fontFamily:sans,color:C.ink}}>
    <Backdrop /><Chrome page="Skills" section="RESEARCH SKILLS" />
    <Interactive.Div name="Skills page heading" style={{position:'absolute',left:88,top:167,opacity:interpolate(frame,[0,24],[0,1],ease),translate:interpolate(frame,[0,24],['0px 20px','0px 0px'],ease)}}><div style={{fontFamily:mono,fontSize:18,letterSpacing:3,color:C.green,marginBottom:22}}>03 / TAKE THE RESEARCH WITH YOU</div><div style={{fontSize:68}}>Research, beyond the graph.</div></Interactive.Div>
    <Interactive.Div name="Download bundle graphic" style={{position:'absolute',left:124,top:360,width:450,opacity:interpolate(frame,[8,32],[0,1],ease),translate:interpolate(frame,[8,32],['-40px 0px','0px 0px'],ease)}}>
      <svg width="450" height="360" viewBox="0 0 450 360"><defs><linearGradient id="folder" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.green} stopOpacity=".25"/><stop offset="1" stopColor={C.green} stopOpacity=".02"/></linearGradient></defs><path d="M45 65H160L195 100H405V309H45Z" fill="url(#folder)" stroke={C.green} strokeWidth="2"/><path d="M45 120H405" stroke={C.green} opacity=".4"/><path d="M225 147V254M181 214L225 258L269 214" fill="none" stroke={C.green} strokeWidth="7"/><path d="M168 275H282" stroke={C.green} strokeWidth="3"/><text x="67" y="91" fontFamily={mono} fontSize="14" fill={C.green}>PI // RESEARCH</text></svg>
      <div style={{fontFamily:mono,fontSize:32,textAlign:'center',marginTop:14}}>pelosi-skills.zip</div><div style={{fontFamily:mono,fontSize:18,color:C.green,letterSpacing:3,textAlign:'center',marginTop:20}}>6 SKILLS / OFFICIAL SOURCES</div>
      <div style={{height:1,background:C.line,margin:'37px 0 24px'}}/><div style={{fontSize:24,textAlign:'center',color:C.mute}}>Codex · Claude Code · Grok CLI</div>
    </Interactive.Div>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0,pointerEvents:'none'}}>{skills.map((_,i)=><path key={i} d={`M575 588 C655 588 650 ${365+i*96} 724 ${365+i*96}`} stroke={categories[i%5]} strokeWidth="1" fill="none" opacity={interpolate(frame,[20+i*8,50+i*8],[0,.5],ease)} />)}</svg>
    {skills.map(([tag,title,id],i)=><Interactive.Div key={id} name={id} style={{position:'absolute',left:726,right:88,top:321+i*96,height:84,border:`1px solid ${C.line}`,borderLeft:`2px solid ${categories[i%5]}`,background:'#0b1411dd',display:'flex',alignItems:'center',gap:25,padding:'0 27px',opacity:interpolate(frame,[25+i*9,49+i*9],[0,1],ease),translate:interpolate(frame,[25+i*9,49+i*9],['55px 0px','0px 0px'],ease)}}><div style={{fontFamily:mono,fontSize:22,color:categories[i%5],width:37}}>0{i+1}</div><div><div style={{fontFamily:mono,fontSize:12,letterSpacing:2,color:C.mute,marginBottom:7}}>{tag}</div><div style={{fontSize:29}}>{title}</div></div><div style={{fontFamily:mono,fontSize:17,color:C.mute,marginLeft:'auto'}}>{id}</div><div style={{fontSize:28,color:C.green,marginLeft:14}}>↓</div></Interactive.Div>)}
    <div style={{position:'absolute',left:726,top:914,fontSize:22,color:C.mute,opacity:interpolate(frame,[92,120],[0,1],ease)}}>Download. Verify. Keep investigating.</div>
    <Scan /><AbsoluteFill style={{pointerEvents:'none',background:C.bg,opacity:interpolate(frame,[202,209],[0,.5],linear)}} />
  </AbsoluteFill>;
};
