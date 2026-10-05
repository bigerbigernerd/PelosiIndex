import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {Opening} from './scenes/Opening';
import {Overview} from './scenes/Overview';
import {PelosiScene} from './scenes/Pelosi';
import {StockScene} from './scenes/Stock';
import {SkillsScene} from './scenes/Skills';
import {Closing} from './scenes/Closing';

export const PelosiPromo = () => <AbsoluteFill style={{background:'#070b0a'}}>
  <Sequence name="01 Brand ignition" durationInFrames={120}><Opening /></Sequence>
  <Sequence name="02 Disclosure universe" from={120} durationInFrames={240}><Overview /></Sequence>
  <Sequence name="03 Pelosi and original evidence" from={360} durationInFrames={240}><PelosiScene /></Sequence>
  <Sequence name="04 NVDA reverse lookup" from={600} durationInFrames={180}><StockScene /></Sequence>
  <Sequence name="05 Research skills" from={780} durationInFrames={180}><SkillsScene /></Sequence>
  <Sequence name="06 Open-source invitation" from={960} durationInFrames={120}><Closing /></Sequence>
  <Audio src={staticFile('audio/disclosure-night.wav')} volume={0.82} />
</AbsoluteFill>;
