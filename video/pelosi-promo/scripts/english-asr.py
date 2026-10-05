import os
os.environ.setdefault('CUDA_VISIBLE_DEVICES', os.environ.get('VOX_GPU', '0'))
import json
import re
import subprocess
from pathlib import Path
import numpy as np
import torch
from transformers import WhisperProcessor, WhisperForConditionalGeneration

ROOT = Path(os.environ.get('PELOSI_VOICE_OUTPUT', Path(__file__).resolve().parents[1] / 'public/audio/english/raw'))
ROOT.mkdir(parents=True, exist_ok=True)
manifest = json.loads((ROOT/'voice-manifest.json').read_text())
processor = WhisperProcessor.from_pretrained('openai/whisper-base.en', local_files_only=True)
model = WhisperForConditionalGeneration.from_pretrained('openai/whisper-base.en', local_files_only=True, dtype=torch.float16).to('cuda').eval()
def words(text):
    return re.findall(r"[a-z]+(?:'[a-z]+)?", text.lower().replace('’', "'"))
checks = []
for row in manifest['segments']:
    raw = subprocess.run(['ffmpeg','-v','error','-i',str(ROOT/row['file']),'-ac','1','-ar','16000','-f','f32le','pipe:1'], capture_output=True, check=True).stdout
    wave = np.frombuffer(raw,dtype=np.float32).copy()
    inputs = processor(wave,sampling_rate=16000,return_tensors='pt',return_attention_mask=True)
    with torch.inference_mode():
        output = model.generate(inputs.input_features.to('cuda',torch.float16),attention_mask=inputs.attention_mask.to('cuda'),max_new_tokens=120)
    transcript = processor.batch_decode(output,skip_special_tokens=True)[0].strip()
    result = {'file':row['file'],'expected':row['text'],'transcript':transcript,'word_sequence_matches':words(row['text'])==words(transcript)}
    checks.append(result)
    print(json.dumps(result),flush=True)
(ROOT/'asr-check.json').write_text(json.dumps({'method':'Whisper base.en, no transcript prompting','checks':checks},indent=2)+'\n')
