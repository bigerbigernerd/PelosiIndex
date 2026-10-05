import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderStill} from '@remotion/renderer';
import {resolve} from 'node:path';
import {writeFileSync,mkdirSync} from 'node:fs';
const executable=process.env.REMOTION_BROWSER_EXECUTABLE;
mkdirSync(resolve('qa/english'),{recursive:true});
const serveUrl=await bundle({entryPoint:resolve('src/index.ts')});
const browser=await openBrowser('chrome',{browserExecutable:executable});
const checks=[['brand',70],['universe',210],['pelosi',495],['nvda',690],['skills',900],['closing',1040]];
try {
  const composition=await selectComposition({serveUrl,id:'PelosiPromo',puppeteerInstance:browser});
  for(const [name,frame] of checks){
    await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,output:resolve(`qa/${name}.png`),imageFormat:'png'});
    console.log(`Checked ${name} at ${frame/30}s.`);
  }
  writeFileSync('qa/frame-check.json',JSON.stringify({composition:'PelosiPromo',width:composition.width,height:composition.height,fps:composition.fps,durationInFrames:composition.durationInFrames,subtitleTracks:0,voiceTracks:0,frames:checks},null,2)+'\n');
} finally {await browser.close({silent:true});}
