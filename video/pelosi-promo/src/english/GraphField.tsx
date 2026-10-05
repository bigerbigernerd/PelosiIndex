import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {cancelRender, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, categories, ease, graph} from './design';
import atlasMeta from './data/atlas.json';

const ns = graph.S.length;
const nodes = [...graph.S.map((s, i) => ({x:s.x, y:s.y, label:s.en, img:s.img, color:categories[s.c], subject:true, i})), ...graph.T.map((t, i) => ({x:t.x, y:t.y, label:t.t, img:t.img, color:C.green, subject:false, i}))];
const bounds = {xmin:Math.min(...nodes.map(n=>n.x)), xmax:Math.max(...nodes.map(n=>n.x)), ymin:Math.min(...nodes.map(n=>n.y)), ymax:Math.max(...nodes.map(n=>n.y))};
const focus = graph.S.findIndex(s => s.id === 'house-p000197');
const tint = (k: number) => ['add','new','buy'].includes(graph.kinds[k]) ? C.green : ['trim','exit','sell'].includes(graph.kinds[k]) ? C.red : graph.kinds[k] === 'mixed' ? C.gold : '#8dab9a';

export const GraphField = ({mode = 'tour', opacity = 1}: {mode?: 'tour' | 'ambient'; opacity?:number}) => {
  const frame = useCurrentFrame();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [atlas, setAtlas] = useState<HTMLImageElement | null>(null);
  const [handle] = useState(() => delayRender('Load source website atlas'));
  useEffect(() => {
    const img = new Image();
    img.onload = () => {setAtlas(img); continueRender(handle);};
    img.onerror = () => cancelRender(new Error('Could not load verified atlas'));
    img.src = staticFile('img/english/atlas.webp');
  }, [handle]);
  useLayoutEffect(() => {
    if (!canvas.current || !atlas) return;
    const ctx = canvas.current.getContext('2d')!;
    ctx.clearRect(0,0,1920,1080);
    ctx.save();
    if(mode==='tour'){ctx.beginPath();ctx.rect(650,130,1190,850);ctx.clip();}
    const fit = Math.min(1460/(bounds.xmax-bounds.xmin),830/(bounds.ymax-bounds.ymin));
    const travel = mode === 'tour' ? interpolate(frame,[145,225],[0,1],ease) : 0;
    const k = fit*(1+travel*.7);
    const cameraX = (bounds.xmax+bounds.xmin)/2*(1-travel) + graph.S[focus].x*travel;
    const cameraY = (bounds.ymax+bounds.ymin)/2*(1-travel) + graph.S[focus].y*travel;
    const centerX = mode === 'tour' ? 1080 : 960;
    const centerY = 575;
    const positions = nodes.map((n,i)=>({x:centerX+(n.x-cameraX)*k+Math.cos(frame/80+i*2.13)*4,y:centerY+(n.y-cameraY)*k+Math.sin(frame/93+i*1.31)*4}));
    for (let i=0;i<graph.E.length;i++) {
      const [s,t,kind] = graph.E[i];
      const a=positions[s],b=positions[ns+t];
      const selected=s===focus && travel>.1;
      ctx.globalAlpha=selected ? .65 : .20*(1-travel*.75);
      ctx.strokeStyle=tint(kind);ctx.lineWidth=selected ? 1.45 : .7;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      if (i%3===0 || selected) {
        const p=(frame/(90+(i%71))+i*.173)%1;
        ctx.globalAlpha=selected?.9:.55*(1-travel*.7);
        ctx.fillStyle=tint(kind);ctx.shadowColor=tint(kind);ctx.shadowBlur=selected?12:5;
        ctx.beginPath();ctx.arc(a.x+(b.x-a.x)*p,a.y+(b.y-a.y)*p,selected?3:1.6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      }
    }
    const related = new Set(graph.E.filter(e=>e[0]===focus).map(e=>ns+e[1]));
    nodes.forEach((n,i)=>{
      const p=positions[i];
      const selected=i===focus || related.has(i);
      const r=(n.subject ? 15 : 5.7)*(1+travel*.48);
      ctx.globalAlpha=selected ? 1 : 1-travel*.65;
      ctx.shadowColor=n.color;ctx.shadowBlur=n.subject?15:0;
      ctx.fillStyle='#0c1712';ctx.strokeStyle=n.subject?n.color:'#597d67';ctx.lineWidth=n.subject?1.5:1;
      ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
      if(n.img>=0 && (n.subject || selected || travel>.8)) {
        ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,r-1.5,0,Math.PI*2);ctx.clip();ctx.imageSmoothingEnabled=false;
        const sx=(n.img%atlasMeta.cols)*64,sy=Math.floor(n.img/atlasMeta.cols)*64;
        ctx.drawImage(atlas,sx,sy,64,64,p.x-r,p.y-r,r*2,r*2);ctx.restore();
      }
      if(i===focus && travel>.15) {
        ctx.globalAlpha=travel*.6;ctx.strokeStyle=C.red;ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(p.x,p.y,r+16+Math.sin(frame/15)*4,0,Math.PI*2);ctx.stroke();
      }
    });
    // Label collision avoidance keeps dense hubs readable at video scale.
    if(mode==='ambient') {ctx.globalAlpha=1;ctx.restore();return;}
    const occupied: Array<{x:number;y:number;w:number;h:number}> = positions.map((p,i)=>{
      const r=(nodes[i].subject?15:5.7)*(1+travel*.48)+4;
      return {x:p.x-r,y:p.y-r,w:r*2,h:r*2};
    });
    const featured = new Set(['house-p000197','elon-musk','jensen-huang','jeff-bezos','berkshire','citadel','bridgewater','norges','temasek','pershing-square','renaissance','soros','donald-j-trump','gates-foundation-trust']);
    const priority=nodes.map((n,i)=>({n,i})).filter(({n,i})=>(n.subject&&featured.has(graph.S[n.i].id))||i===focus||(travel>.4&&related.has(i))).sort((a,b)=> (a.i===focus?-2:related.has(a.i)?-1:0)-(b.i===focus?-2:related.has(b.i)?-1:0));
    for(const {n,i} of priority){
      const p=positions[i],r=(n.subject?15:5.7)*(1+travel*.48);
      ctx.font=`${n.subject?16:18}px SpaceVideo`;
      const w=ctx.measureText(n.label).width+8,box={x:p.x-w/2,y:p.y+r+9,w,h:21};
      if(box.x<715||box.x+box.w>1830||box.y<175||box.y+box.h>970)continue;
      if(occupied.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y))continue;
      occupied.push(box);ctx.globalAlpha=i===focus||related.has(i)?1:1-travel*.65;
      ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle=C.ink;ctx.shadowColor=C.bg;ctx.shadowBlur=5;
      ctx.fillText(n.label,p.x,box.y);ctx.shadowBlur=0;
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }, [frame, atlas, mode]);
  return <canvas ref={canvas} width={1920} height={1080} style={{position:'absolute',inset:0,width:1920,height:1080,opacity}} />;
};
