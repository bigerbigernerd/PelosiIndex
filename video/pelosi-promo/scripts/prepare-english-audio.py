"""Normalize delivery level without changing original speech timing or pitch."""
import json
import os
import shutil
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
ffmpeg = os.environ.get('REMOTION_FFMPEG_EXECUTABLE') or shutil.which('ffmpeg') or str(root/'node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg')
(root/'qa/english').mkdir(parents=True, exist_ok=True)
assets = root/'public/audio/english'
rawdir = assets/'raw'
rawdir.mkdir(exist_ok=True)
report = []
for name in ['01-brand','02-universe','03-evidence','04-stock','05-research','06-close']:
    target = assets/(name+'.wav')
    original = rawdir/target.name
    if not original.exists():
        original.write_bytes(target.read_bytes())
    analysis = subprocess.run([ffmpeg,'-hide_banner','-i',str(original),'-af','loudnorm=I=-18:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
    measure = json.loads(re.findall(r'\{[^{}]+\}',analysis.stderr)[-1])
    filter_ = ('loudnorm=I=-18:TP=-2:LRA=11:linear=true:'
               f"measured_I={measure['input_i']}:measured_TP={measure['input_tp']}:"
               f"measured_LRA={measure['input_lra']}:measured_thresh={measure['input_thresh']}:"
               f"offset={measure['target_offset']}")
    subprocess.run([ffmpeg,'-v','error','-y','-i',str(original),'-af',filter_,'-ar','48000','-c:a','pcm_s24le',str(target)],check=True)
    report.append({'file':target.name,'original':str(original.relative_to(root)),'input_lufs':measure['input_i'],'target_lufs':-18,'true_peak_limit_dbtp':-2,'time_stretch':False,'pitch_shift':False})
    print('Prepared',target.name,flush=True)
(root/'qa/english/voice-levels.json').write_text(json.dumps(report,indent=2)+'\n')
