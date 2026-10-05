#!/usr/bin/env python3
"""Audit the tracked export for private configs and recognizable credential literals."""
import re
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP = {'node_modules', '.git', 'dist', '__pycache__', 'raw', 'svg-raster'}
SECRET = [
    re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    re.compile(rb'gh[pousr]_[A-Za-z0-9_]{30,}'),
    re.compile(rb'sk-(?:proj-)?[A-Za-z0-9_-]{30,}'),
    re.compile(rb'AKIA[0-9A-Z]{16}'),
]


def check():
    tracked = subprocess.run(['git', 'ls-files', '-z'], cwd=ROOT, capture_output=True)
    names = [ROOT / n.decode() for n in tracked.stdout.split(b'\0') if n] if tracked.returncode == 0 and tracked.stdout else list(ROOT.rglob('*'))
    problems, checked = [], 0
    for path in names:
        if not path.is_file() or any(p in SKIP for p in path.relative_to(ROOT).parts):
            continue
        relative = path.relative_to(ROOT).as_posix()
        if path.name.startswith('.env') or path.suffix in ('.pem', '.key') or relative.startswith(('deploy/', 'server/')):
            problems.append(f'private/config path: {relative}')
        blobs = [(relative, path.read_bytes())]
        if path.suffix == '.zip':
            with zipfile.ZipFile(path) as archive:
                blobs.extend((relative + ':' + f, archive.read(f)) for f in archive.namelist() if not f.endswith('/'))
        for name, blob in blobs:
            if any(pattern.search(blob) for pattern in SECRET):
                problems.append(f'credential pattern: {name}')
            if re.search(rb'(?<![A-Za-z0-9:/.-])/(?:home|media)/[a-zA-Z0-9_-]+/', blob):
                problems.append(f'private workstation path: {name}')
        checked += 1
    if problems:
        raise SystemExit('\n'.join(problems))
    print(f'Release audit passed for {checked} files, including packaged Skill contents.')


if __name__ == '__main__':
    check()
