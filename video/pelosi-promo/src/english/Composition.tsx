import {AbsoluteFill, Sequence, staticFile, interpolate, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {EnglishOpening} from './scenes/Opening';
import {EnglishOverview} from './scenes/Overview';
import {EnglishPelosiScene} from './scenes/Pelosi';
import {EnglishStockScene} from './scenes/Stock';
import {EnglishSkillsScene} from './scenes/Skills';
import {EnglishClosing} from './scenes/Closing';

type Props = {voiceover: boolean};
export const PelosiPromoEnglish = ({voiceover}: Props) => {
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{background:'#070b0a'}}>
    <Sequence name="01 Brand ignition" durationInFrames={120}><EnglishOpening /></Sequence>
    <Sequence name="02 Disclosure universe" from={120} durationInFrames={240}><EnglishOverview /></Sequence>
    <Sequence name="03 Pelosi and original evidence" from={360} durationInFrames={270}><EnglishPelosiScene /></Sequence>
    <Sequence name="04 NVDA reverse lookup" from={630} durationInFrames={210}><EnglishStockScene /></Sequence>
    <Sequence name="05 Research skills" from={840} durationInFrames={210}><EnglishSkillsScene /></Sequence>
    <Sequence name="06 Follow the filings" from={1050} durationInFrames={150}><EnglishClosing /></Sequence>
    <Audio src={staticFile('audio/english/disclosure-night-en.wav')} volume={voiceover ? interpolate(frame,[0,12,24,88,104,124,334,354,376,610,626,646,817,836,856,1028,1046,1065,1155,1185,1199],[.65,.65,.19,.19,.58,.19,.19,.58,.19,.19,.58,.19,.19,.58,.19,.19,.58,.19,.19,.4,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}) : .8} />
    {voiceover && <>
      <Audio name="Opening English voice" from={18} src={staticFile('audio/english/01-brand.wav')} />
      <Audio name="Graph English voice" from={130} src={staticFile('audio/english/02-universe.wav')} />
      <Audio name="Evidence English voice" from={374} src={staticFile('audio/english/03-evidence.wav')} />
      <Audio name="Stock English voice" from={642} src={staticFile('audio/english/04-stock.wav')} />
      <Audio name="Research English voice" from={852} src={staticFile('audio/english/05-research.wav')} />
      <Audio name="Closing English voice" from={1064} src={staticFile('audio/english/06-close.wav')} />
    </>}
  </AbsoluteFill>;
};
