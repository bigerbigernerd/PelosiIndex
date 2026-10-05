# PI// Pelosi Index · Remotion promo

40-second English promo, 1920×1080 at 30 fps: dark disclosure graph, original electronic instrumental, and original synthetic English narration. No dialogue, narration or lyric subtitles are burned in. The original 36-second Chinese-interface instrumental composition is retained.

## Preview and editing

```sh
npm ci
npm run dev -- --port 5198
```

Open `http://localhost:5198/PelosiPromo-English`. The `English-Scenes` folder exposes each of the six editable scenes. `PelosiPromo-English-Instrumental` uses the same picture with music only; `PelosiPromo` is the original Chinese draft. Rendering is available in Remotion Studio.

## Included assets

- `src/english/`: English composition, scene markup and pinned 2026-10-05 public snapshot (`c0a9b334cc77d58d`).
- `public/audio/english/`: delivery-level English voice stems and the original 40-second electronic score. `raw/` preserves unmodified synthesized speech and its manifest.
- `scripts/music-en.mjs`: original 120 BPM, D-minor instrumental; no vocals or third-party samples.
- `src/english/data/credits.json` and `src/data/credits.json`: portrait and trademark attribution.
- `FONT_NOTICES.txt` and `public/fonts/SPACE-GROTESK-OFL.txt`: font license notices.

The composition introduces graph exploration, original filing evidence, stock lookup and downloadable research Skills. Dates, ownership labels, options and reported ranges remain distinct. It does not claim live prices or investment returns.

## Validation

```sh
npm run check
npm run check:frames
node scripts/check-english-mix.mjs
```

The frame script uses Remotion's default browser, or `REMOTION_BROWSER_EXECUTABLE` if supplied. Generated QA outputs are ignored by Git. Representative frames were inspected; the six narration segments matched independent Whisper transcription, fitted their scenes, and the mixed soundtrack had no sample clipping. Remotion's existing ESLint plugin configuration timed out during local checks; TypeScript passed.

## Optional speech regeneration

Existing audio is ready to preview; no model is required. To regenerate, provide an existing VoxCPM2 Python environment and model path:

```sh
export VOXCPM_MODEL_PATH="/path/to/VoxCPM2"
export VOX_GPU="0"
python scripts/english-voice.py
python3 scripts/prepare-english-audio.py
```

Generated raw speech defaults to `public/audio/english/raw/`; `PELOSI_VOICE_OUTPUT` can override that location. Install VoxCPM2 separately using its official instructions. The optional ASR check requires locally available `openai/whisper-base.en` weights. Speech keeps its synthesized timing and pitch; preparation adjusts loudness only. It uses system FFmpeg, `REMOTION_FFMPEG_EXECUTABLE`, or the bundled Linux FFmpeg fallback. Model weights, credentials and workstation settings are not included.

The export pins `typescript-eslint` 8.71.0 for Remotion's development lint configuration to avoid its older dependency chain. The configuration loads successfully; full development and production dependency audits passed when this export was prepared.

## YouTube assets

`YouTube-Cover` is a separate editable Still using the same brand design and an attributed public congressional portrait. It does not add subtitles to the video.

```sh
npx remotion render src/index.ts PelosiPromo-English out/youtube/Pelosi-Index-English-1080p.mp4 --codec=h264 --crf=16 --audio-codec=aac
npx remotion still src/index.ts YouTube-Cover out/youtube/Pelosi-Index-YouTube-Cover-4K.jpg --image-format=jpeg --jpeg-quality=86 --scale=2
```

The upload copy includes a 40-second H.264/AAC movie, a 3840×2160 JPEG thumbnail and separate English title, description and tag files. Generated exports and QA files stay under the ignored `out/` and `qa/` directories. Thumbnail portrait provenance is recorded in `public/youtube/credits.json`.
