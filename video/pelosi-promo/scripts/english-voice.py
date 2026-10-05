"""Run with the installed VoxCPM2 environment; preserve native timing and pitch."""
import os
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ.setdefault('CUDA_VISIBLE_DEVICES', os.environ.get('VOX_GPU', '0'))
import json
import time
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from voxcpm import VoxCPM

ROOT = Path(os.environ.get('PELOSI_VOICE_OUTPUT', Path(__file__).resolve().parents[1] / 'public/audio/english/raw'))
ROOT.mkdir(parents=True, exist_ok=True)
STYLE = ('A confident American male technology-commercial narrator, warm low voice, '
         'crisp clear English, conversational medium pace, controlled energy, '
         'clean dry studio recording, no music')
LINES = [
    ('01-brand', 'Public filings. A bigger picture.'),
    ('02-universe', 'Meet Pelosi Index. Explore disclosed trades and holdings across politicians, company insiders, and major funds.'),
    ('03-evidence', "Follow Nancy Pelosi's reported household trades. Inspect the dates, ownership labels, and original filing evidence."),
    ('04-stock', 'Start with a stock. Discover who reported exposure, and how their disclosures connect.'),
    ('05-research', 'Download the data and research skills. Take the investigation into your own workflow.'),
    ('06-close', 'Follow the filings. See the bigger picture.'),
]
started = time.monotonic()
model = VoxCPM.from_pretrained(os.environ['VOXCPM_MODEL_PATH'], load_denoiser=False, optimize=False, device='cuda:0')
loaded = time.monotonic()
records = []
reference = None
for i, (name, text) in enumerate(LINES):
    target = ROOT / (name + '.wav')
    torch.manual_seed(10051 + i)
    args = {'text': f'({STYLE}){text}', 'cfg_value': 2.0, 'inference_timesteps': 20}
    if reference is not None:
        args['reference_wav_path'] = str(reference)
    t = time.monotonic()
    waveform = np.asarray(model.generate(**args))
    sr = model.tts_model.sample_rate
    sf.write(target, waveform, sr, subtype='PCM_24')
    peak = float(np.max(np.abs(waveform)))
    rms = float(np.sqrt(np.mean(waveform ** 2)))
    row = {'file': target.name, 'text': text, 'duration': len(waveform) / sr,
           'sample_rate': sr, 'peak': peak, 'rms': rms,
           'generation_seconds': time.monotonic() - t, 'seed': 10051 + i,
           'reference': reference.name if reference else None,
           'time_stretch_applied': False, 'pitch_shift_applied': False}
    records.append(row)
    (ROOT / 'voice-manifest.json').write_text(json.dumps({'model': 'openbmb/VoxCPM2', 'style': STYLE, 'load_seconds': loaded-started, 'segments': records}, indent=2)+'\n')
    print(json.dumps(row), flush=True)
    if peak < .04 or rms < .008 or peak >= 1:
        raise RuntimeError('Generated audio needs regeneration: abnormal audio level')
    if reference is None:
        reference = target
print('VOICE_READY', flush=True)
