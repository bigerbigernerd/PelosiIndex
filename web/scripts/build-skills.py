#!/usr/bin/env python3
"""Package skills-src/* (+ the existing disclosure-research skill) into public/downloads/*.zip."""
import shutil
import zipfile
from pathlib import Path

WEB = Path(__file__).resolve().parents[1]
SRC = WEB / 'skills-src'
OUT = WEB / 'public' / 'downloads'
NEEDS_EDGAR = {'sec-13f-diff', 'form4-insider-tracker'}
FIXED = (2026, 10, 4, 0, 0, 0)        # stable timestamps -> stable zip bytes


def files(root):
    return sorted(p for p in root.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.pyc')


def add(z, path, arc):
    info = zipfile.ZipInfo(arc, FIXED)
    info.external_attr = (0o755 if path.suffix == '.py' else 0o644) << 16
    info.compress_type = zipfile.ZIP_DEFLATED
    z.writestr(info, path.read_bytes())


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    skills = {p.name: p for p in SRC.iterdir() if p.is_dir() and not p.name.startswith('_')}
    skills['disclosure-research'] = WEB.parent / 'skills' / 'disclosure-research'
    for name in NEEDS_EDGAR:
        shutil.copy(SRC / '_shared' / 'edgar.py', skills[name] / 'scripts' / 'edgar.py')
    with zipfile.ZipFile(OUT / 'pelosi-skills.zip', 'w') as bundle:
        for name, root in sorted(skills.items()):
            with zipfile.ZipFile(OUT / f'{name}.zip', 'w') as z:
                for f in files(root):
                    arc = f'{name}/{f.relative_to(root).as_posix()}'
                    add(z, f, arc)
                    add(bundle, f, arc)
            print(f'{name}.zip', (OUT / f'{name}.zip').stat().st_size)
    print('pelosi-skills.zip', (OUT / 'pelosi-skills.zip').stat().st_size)


if __name__ == '__main__':
    main()
