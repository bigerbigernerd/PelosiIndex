import React from 'react';
import {Composition,Folder} from 'remotion';
import {PelosiPromo} from './Composition';
import {Opening} from './scenes/Opening';
import {Overview} from './scenes/Overview';
import {PelosiScene} from './scenes/Pelosi';
import {StockScene} from './scenes/Stock';
import {SkillsScene} from './scenes/Skills';
import {Closing} from './scenes/Closing';
import {PelosiPromoEnglish} from './english/Composition';
import {EnglishOpening} from './english/scenes/Opening';
import {EnglishOverview} from './english/scenes/Overview';
import {EnglishPelosiScene} from './english/scenes/Pelosi';
import {EnglishStockScene} from './english/scenes/Stock';
import {EnglishSkillsScene} from './english/scenes/Skills';
import {EnglishClosing} from './english/scenes/Closing';

export const RemotionRoot: React.FC = () => <>
  <Composition id="PelosiPromo-English" component={PelosiPromoEnglish} durationInFrames={1200} fps={30} width={1920} height={1080} defaultProps={{voiceover: true}} />
  <Composition id="PelosiPromo-English-Instrumental" component={PelosiPromoEnglish} durationInFrames={1200} fps={30} width={1920} height={1080} defaultProps={{voiceover: false}} />
  <Folder name="English-Scenes">
    <Composition id="EN-Brand" component={EnglishOpening} durationInFrames={120} fps={30} width={1920} height={1080} />
    <Composition id="EN-Universe" component={EnglishOverview} durationInFrames={240} fps={30} width={1920} height={1080} />
    <Composition id="EN-Pelosi" component={EnglishPelosiScene} durationInFrames={270} fps={30} width={1920} height={1080} />
    <Composition id="EN-NVDA" component={EnglishStockScene} durationInFrames={210} fps={30} width={1920} height={1080} />
    <Composition id="EN-Skills" component={EnglishSkillsScene} durationInFrames={210} fps={30} width={1920} height={1080} />
    <Composition id="EN-Invitation" component={EnglishClosing} durationInFrames={150} fps={30} width={1920} height={1080} />
  </Folder>
  <Composition id="PelosiPromo" component={PelosiPromo} durationInFrames={1080} fps={30} width={1920} height={1080} />
  <Folder name="Scenes">
    <Composition id="Brand" component={Opening} durationInFrames={120} fps={30} width={1920} height={1080} />
    <Composition id="Universe" component={Overview} durationInFrames={240} fps={30} width={1920} height={1080} />
    <Composition id="Pelosi" component={PelosiScene} durationInFrames={240} fps={30} width={1920} height={1080} />
    <Composition id="NVDA" component={StockScene} durationInFrames={180} fps={30} width={1920} height={1080} />
    <Composition id="Skills" component={SkillsScene} durationInFrames={180} fps={30} width={1920} height={1080} />
    <Composition id="Invitation" component={Closing} durationInFrames={120} fps={30} width={1920} height={1080} />
  </Folder>
</>;
