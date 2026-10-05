import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderStill} from '@remotion/renderer';
import {resolve} from 'node:path';
import {writeFileSync,mkdirSync} from 'node:fs';
const executable=process.env.REMOTION_BROWSER_EXECUTABLE;
mkdirSync(resolve('qa/english'),{recursive:true});
const serveUrl=await bundle({entryPoint:resolve('src/index.ts')});
const browser=await openBrowser('chrome',{browserExecutable:executable});
const checks=[['brand',75],['universe',225],['universe-zoom',335],['pelosi',510],['nvda',738],['skills',972],['closing',1140]];
try {
  const composition=await selectComposition({serveUrl,id:'PelosiPromo-English',puppeteerInstance:browser,inputProps:{voiceover:true}});
  for(const [name,frame] of checks){
    await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,output:resolve(`qa/english/${name}.png`),imageFormat:'png',inputProps:{voiceover:true}});
    console.log(`Checked ${name} at ${frame/30}s.`);
  }
  writeFileSync('qa/english/frame-check.json',JSON.stringify({composition:composition.id,width:composition.width,height:composition.height,fps:composition.fps,durationInFrames:composition.durationInFrames,subtitleTracks:0,voiceTracks:6,frames:checks},null,2)+'\n');
} finally {await browser.close({silent:true});}
