import os
os.environ['HF_HUB_DISABLE_TELEMETRY']='1'
os.environ.setdefault('CUDA_VISIBLE_DEVICES', os.environ.get('VOX_GPU', '0'))
import json
import time
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from voxcpm import VoxCPM
root=Path(os.environ.get('PELOSI_VOICE_OUTPUT', Path(__file__).resolve().parents[1] / 'public/audio/english/raw'))
root.mkdir(parents=True, exist_ok=True)
manifest=json.loads((root/'voice-manifest.json').read_text())
text='Follow the filings. See the bigger picture.'
model=VoxCPM.from_pretrained(os.environ['VOXCPM_MODEL_PATH'],load_denoiser=False,optimize=False,device='cuda:0')
torch.manual_seed(10061)
start=time.monotonic()
wave=np.asarray(model.generate(text=f"({manifest['style']}){text}",reference_wav_path=str(root/'01-brand.wav'),cfg_value=2.0,inference_timesteps=20))
sr=model.tts_model.sample_rate
sf.write(root/'06-close.wav',wave,sr,subtype='PCM_24')
manifest['segments'][-1].update(text=text,duration=len(wave)/sr,seed=10061,peak=float(np.max(np.abs(wave))),rms=float(np.sqrt(np.mean(wave**2))),generation_seconds=time.monotonic()-start)
(root/'voice-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest['segments'][-1]),flush=True)
