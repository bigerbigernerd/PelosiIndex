import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
mkdirSync('qa/english',{recursive:true});
const rate=48000,total=rate*40;
const keys=[0,12,24,88,104,124,334,354,376,610,626,646,817,836,856,1028,1046,1065,1155,1185,1199];
const values=[.65,.65,.19,.19,.58,.19,.19,.58,.19,.19,.58,.19,.19,.58,.19,.19,.58,.19,.19,.4,0];
const audio=file=>{
  const wav=readFileSync(file);
  let channels,sampleRate,bits,start,length;
  for(let offset=12;offset+8<wav.length;){
    const chunk=wav.toString('ascii',offset,offset+4),size=wav.readUInt32LE(offset+4);
    if(chunk==='fmt '){channels=wav.readUInt16LE(offset+10);sampleRate=wav.readUInt32LE(offset+12);bits=wav.readUInt16LE(offset+22);}
    if(chunk==='data'){start=offset+8;length=Math.min(size,wav.length-start);break;}
    offset+=8+size+(size%2);
  }
  if(sampleRate!==rate||![16,24].includes(bits)||!start)throw new Error('Unexpected WAV format: '+file);
  const bytes=bits/8,frames=length/bytes/channels,out=new Float32Array(frames*2);
  for(let i=0;i<frames;i++)for(let channel=0;channel<2;channel++){
    const position=start+(i*channels+Math.min(channel,channels-1))*bytes;
    out[i*2+channel]=wav.readIntLE(position,bytes)/(2**(bits-1));
  }
  return out;
};
const music=audio('public/audio/english/disclosure-night-en.wav');
const mix=new Float32Array(total*2);
let key=0;
for(let i=0;i<total;i++){
  const frame=i/rate*30;
  while(key<keys.length-2&&frame>keys[key+1])key++;
  const t=Math.max(0,Math.min(1,(frame-keys[key])/(keys[key+1]-keys[key])));
  const gain=values[key]+(values[key+1]-values[key])*t;
  mix[i*2]=music[i*2]*gain;mix[i*2+1]=music[i*2+1]*gain;
}
const placements=[['01-brand',18],['02-universe',130],['03-evidence',374],['04-stock',642],['05-research',852],['06-close',1064]];
const scenesEnd=[120,360,630,840,1050,1200];
const timings=[];
for(let clip=0;clip<placements.length;clip++){
  const [name,frame]=placements[clip],source=audio(`public/audio/english/${name}.wav`);
  const offset=Math.round(frame/30*rate)*2;
  for(let j=0;j<source.length;j++)mix[offset+j]+=source[j];
  const endFrame=frame+source.length/2/rate*30;
  timings.push({name,startFrame:frame,endFrame,durationSeconds:source.length/2/rate,fitsScene:endFrame<scenesEnd[clip]});
}
let peak=0,sum=0;
for(const value of mix){peak=Math.max(peak,Math.abs(value));sum+=value*value;}
if(peak>=1)throw new Error('Mix clips: '+peak);
if(timings.some(t=>!t.fitsScene))throw new Error('Speech extends beyond its scene');
const wav=Buffer.alloc(44+mix.length*3);
wav.write('RIFF',0);wav.writeUInt32LE(36+mix.length*3,4);wav.write('WAVEfmt ',8);
wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);
wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*6,28);wav.writeUInt16LE(6,32);wav.writeUInt16LE(24,34);
wav.write('data',36);wav.writeUInt32LE(mix.length*3,40);
for(let i=0;i<mix.length;i++)wav.writeIntLE(Math.round(mix[i]*8388607),44+i*3,3);
writeFileSync('qa/english/mix-preview.wav',wav);
writeFileSync('qa/english/mix-check.json',JSON.stringify({seconds:40,channels:2,sampleRate:rate,peakDbFS:20*Math.log10(peak),rmsDbFS:20*Math.log10(Math.sqrt(sum/mix.length)),clipping:false,timings},null,2)+'\n');
console.log('Checked 40-second mix: no clipping, all six voice clips fit their scenes.');
