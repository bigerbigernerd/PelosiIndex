// Original instrumental score: 120 BPM, D minor, 40 seconds. No voices or samples.
import {writeFileSync, mkdirSync} from 'node:fs';
mkdirSync('qa/english',{recursive:true});
const rate=48000, seconds=40, total=rate*seconds;
const L=new Float32Array(total),R=new Float32Array(total);
const tau=Math.PI*2;
let seed=704;
const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/2147483648-1;};
const hz=midi=>440*2**((midi-69)/12);
function add(start,duration,fn,pan=0){
  const from=Math.round(start*rate),end=Math.min(total,from+Math.round(duration*rate));
  const gl=Math.sqrt((1-pan)/2),gr=Math.sqrt((1+pan)/2);
  for(let i=Math.max(from,0);i<end;i++){const t=(i-from)/rate;const v=fn(t);L[i]+=v*gl;R[i]+=v*gr;}
}
function kick(start,amp=1){add(start,.48,t=>{
  const phase=tau*(44*t+105*.025*(1-Math.exp(-t/.025)));
  return amp*(.65*Math.sin(phase)*Math.exp(-t*11)+.05*noise()*Math.exp(-t*150));
});}
function hat(start,open=false,pan=0){let prev=0;add(start,open?.23:.07,t=>{const n=noise(),hp=n-prev;prev=n;return .085*hp*Math.exp(-t*(open?23:68));},pan);}
function clap(start){add(start,.19,t=>{const gate=t<.035?.3:.07;return noise()*gate*Math.exp(-t*28);},.1);}
function bass(start,note){const f=hz(note);add(start,.34,t=>{
  const env=Math.min(1,t/.008)*Math.exp(-t*10);
  const duck=1-.68*Math.exp(-t*17);
  return .31*(Math.sin(tau*f*t)+.21*Math.sin(tau*f*2*t)+.11*Math.sin(tau*f*3*t))*env*duck;
});}
function pluck(start,note,pan){const f=hz(note);add(start,1,t=>{
  const env=Math.min(1,t/.003)*Math.exp(-t*9);
  return .105*(Math.sin(tau*f*t)+.22*Math.sin(tau*f*2*t)*Math.exp(-t*13))*env;
},pan);}
const progression=[38,34,41,36];
const motif=[12,19,24,22,19,15,17,19];
for(let bar=0;bar<20;bar++){
  const start=bar*2,root=progression[Math.floor(bar/2)%4];
  const chord=root===34?[0,4,7]:[0,3,7];
  for(let j=0;j<chord.length;j++){
    const f=hz(root+12+chord[j]);
    add(start,4,t=>.036*(Math.sin(tau*f*t)+.2*Math.sin(tau*f*2*t))*(Math.min(1,t/.35))*Math.exp(-Math.max(0,t-1.5)*1.5),j===0?-.55:j===2?.55:0);
  }
  for(let step=0;step<8;step++){
    const t=start+step*.25;
    if(t<4){if(step%4===0)kick(t,.35);if(bar===1)pluck(t,root+motif[step]+12,step%2?.55:-.55);continue;}
    if(t>=38)continue;
    if(step%2===0 && !(t>=34&&t<35))kick(t,t>=28?.78:1);
    hat(t+.125,step%4===3,step%2?.55:-.55);
    if(step===2||step===6)clap(t);
    if(step%2===0 || step===3 || step===7)bass(t,root+(step===7?12:0));
    if(!(t>=28&&t<30))pluck(t,root+motif[step]+12,Math.sin(step*2+bar)*.55);
  }
}
// Soft broadband transitions aligned to scene cuts.
for(const cut of [4,12,21,28,35]){
  let prev=0;
  add(cut-.65,1.05,t=>{const n=noise(),hp=n-prev;prev=n;const env=t<.65?(t/.65)**2:Math.exp(-(t-.65)*10);return .075*hp*env;},-.15);
  add(cut,.7,t=>.12*Math.sin(tau*(95*t+130*.035*(1-Math.exp(-t/.035))))*Math.exp(-t*9));
}
// Stereo delay and light plate tail.
for(const [delay,gain,cross] of [[.1875,.18,true],[.375,.11,true],[.563,.045,false]]){
  const d=Math.round(delay*rate);
  for(let i=total-1;i>=d;i--){L[i]+=(cross?R[i-d]:L[i-d])*gain;R[i]+=(cross?L[i-d]:R[i-d])*gain;}
}
const output=Buffer.alloc(44+total*4);
output.write('RIFF',0);output.writeUInt32LE(36+total*4,4);output.write('WAVEfmt ',8);output.writeUInt32LE(16,16);output.writeUInt16LE(1,20);output.writeUInt16LE(2,22);output.writeUInt32LE(rate,24);output.writeUInt32LE(rate*4,28);output.writeUInt16LE(4,32);output.writeUInt16LE(16,34);output.write('data',36);output.writeUInt32LE(total*4,40);
let sum=0,peak=0;
for(let i=0;i<total;i++){
  const time=i/rate,fade=Math.min(1,time/.22,Math.max(0,(40-time)/1.6));
  const l=Math.tanh(L[i]*1.18)*.88*fade,r=Math.tanh(R[i]*1.18)*.88*fade;
  sum+=(l*l+r*r)/2;peak=Math.max(peak,Math.abs(l),Math.abs(r));
  output.writeInt16LE(Math.round(l*32767),44+i*4);output.writeInt16LE(Math.round(r*32767),46+i*4);
}
mkdirSync('public/audio',{recursive:true});
writeFileSync('public/audio/english/disclosure-night-en.wav',output);
writeFileSync('qa/english/music-check.json',JSON.stringify({seconds,rate,channels:2,bpm:120,key:'D minor',voice:false,samples:false,peakDbFS:20*Math.log10(peak),rmsDbFS:20*Math.log10(Math.sqrt(sum/total))},null,2)+'\n');
console.log('Created original 40-second stereo electronic instrumental.');
