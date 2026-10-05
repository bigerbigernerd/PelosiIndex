"""Pack small (64px) avatars and logos into one WebP sprite atlas for the graph.

Inputs: g4-images raw files + manifest (license/attribution); graph subjects/stocks from out/graph-nolayout.json.
Outputs: web/public/img/atlas-<hash>.webp, web/public/data/v2/atlas.json, web/public/data/v2/credits.json
"""
import hashlib
import io
import json
import math
import re
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from common import SOURCES, OUT, ROOT, WEB_DATA, load_json, write_json

G4 = SOURCES / 'images'
CELL = 64
PAPER = (232, 230, 220, 255)
IMG_DIR = ROOT / 'web' / 'public' / 'img'
RASTER = OUT / 'svg-raster'
# institutions shown by their best-known principal (star & quant); sovereign/pension use the institution mark
PERSON_FIRST = {'star', 'quant'}
# reviewed by eye 2026-10-04: group shots, wrong person, or no visible face -> fall back to the institution mark / monogram
REJECT = {'daniel-loeb', 'chase-coleman', 'paul-singer', 'david-einhorn', 'john-graham', 'lisa-su', 'PSA'}


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', (name or '').lower()).strip('-')


def open_image(path):
    path = Path(path)
    if path.suffix.lower() == '.svg':
        png = RASTER / (path.stem + '.png')
        if not png.exists():
            return None
        path = png
    try:
        im = Image.open(path)
        if getattr(im, 'n_frames', 1) > 1 and path.suffix.lower() == '.ico':
            im = max((im.copy() for _ in [0]), key=lambda x: x.size[0])
        return im.convert('RGBA')
    except Exception:
        return None


def circle_mask(size, feather=1):
    big = size * 4
    m = Image.new('L', (big, big), 0)
    ImageDraw.Draw(m).ellipse((2, 2, big - 3, big - 3), fill=255)
    return m.resize((size, size), Image.LANCZOS).filter(ImageFilter.GaussianBlur(feather * 0.3))


def avatar_cell(im):
    w, h = im.size
    side = min(w, h)
    top = int((h - side) * 0.12) if h > w else 0           # portraits: keep the face, drop the chest
    left = (w - side) // 2
    face = im.crop((left, top, left + side, top + side)).resize((CELL, CELL), Image.LANCZOS)
    face = ImageOps.autocontrast(face.convert('RGB'), cutoff=1).convert('RGBA')
    out = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    out.paste(face, (0, 0), circle_mask(CELL))
    return out


def logo_cell(im):
    alpha = im.getchannel('A')
    opaque = alpha.getextrema()[0] > 250
    out = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    disk = Image.new('RGBA', (CELL, CELL), PAPER)
    if opaque:
        # app icons usually fill their square: cover the whole coin
        w, h = im.size
        side = min(w, h)
        sq = im.crop(((w - side) // 2, (h - side) // 2, (w - side) // 2 + side, (h - side) // 2 + side)).resize((CELL, CELL), Image.LANCZOS)
        out.paste(sq, (0, 0), circle_mask(CELL))
        return out
    bbox = alpha.getbbox() or (0, 0, *im.size)
    mark = im.crop(bbox)
    inner = int(CELL * 0.64)
    mark.thumbnail((inner, inner), Image.LANCZOS)
    disk.alpha_composite(mark, ((CELL - mark.width) // 2, (CELL - mark.height) // 2))
    out.paste(disk, (0, 0), circle_mask(CELL))
    return out


def rasterize_svgs(paths):
    todo = [p for p in paths if not (RASTER / (p.stem + '.png')).exists()]
    if not todo:
        return
    RASTER.mkdir(parents=True, exist_ok=True)
    script = ROOT / 'web' / 'scripts' / 'raster-svg.mjs'
    subprocess.run(['node', str(script), str(RASTER), *map(str, todo)], check=True)


def build():
    graph = load_json(OUT / 'graph-nolayout.json')
    manifest_path = G4 / 'manifest.json'
    manifest = load_json(manifest_path) if manifest_path.exists() else {}
    licenses = {}
    for item in manifest.get('items', []):
        if isinstance(item, dict) and item.get('local_path'):
            licenses[Path(item['local_path']).stem] = item
    extra_dir = G4.parent.parent / 'logos-extra'
    files = {p.stem: p for p in extra_dir.glob('*.png')}            # small favicon fallbacks, lowest priority
    files |= {p.stem: p for p in (G4 / 'raw' / 'avatars').glob('*')} | {p.stem: p for p in (G4 / 'raw' / 'logos').glob('*')}
    for item in load_json(extra_dir / 'manifest.json')['items']:
        if item.get('local_path'):
            licenses.setdefault(Path(item['local_path']).stem, item)
    rasterize_svgs([p for p in files.values() if p.suffix.lower() == '.svg'])
    roster = {i['id']: i for i in load_json(SOURCES / 'institutions' / 'roster.json')['institutions']}

    cells, index, credits = [], {}, []

    def put(key, path, kind):
        if path.stem in REJECT:
            return False
        im = open_image(path)
        if im is None or min(im.size) < 24:
            return False
        cells.append(avatar_cell(im) if kind == 'avatar' else logo_cell(im))
        index[key] = len(cells) - 1
        lic = licenses.get(path.stem, {})
        credits.append({'key': key, 'file': path.name, 'source': lic.get('file_page_url') or lic.get('source_url'), 'license': lic.get('license'),
                        'author': lic.get('author') or lic.get('attribution'), 'kind': kind})
        return True

    cat_ids = [c['id'] for c in graph['cats']]
    for s in graph['S']:
        sid, cat = s['id'], cat_ids[s['c']]
        if s['k'] in ('ptr', 'form4'):
            path = files.get(sid)
            if path:
                put(f'avatar:{sid}', path, 'avatar')
            continue
        person = slug(((roster.get(sid) or {}).get('person') or '').split('/')[0])
        person_path = files.get(person) if person else None
        logo_path = files.get(f'inst-{sid}')
        order = [(person_path, 'avatar'), (logo_path, 'logo')] if cat in PERSON_FIRST else [(logo_path, 'logo'), (person_path, 'avatar')]
        for path, kind in order:
            if path and put(f'inst:{sid}', path, kind):
                break
    for t in graph['T']:
        path = files.get(t['t']) or files.get(t['t'].replace('.', '-'))
        if path:
            put(f"logo:{t['t']}", path, 'logo')

    if not cells:
        raise SystemExit('No attributed source images available; preserve the checked-in atlas.')
    cols = math.ceil(math.sqrt(len(cells)))
    rows = math.ceil(len(cells) / cols)
    sheet = Image.new('RGBA', (cols * CELL, rows * CELL), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        sheet.paste(c, ((i % cols) * CELL, (i // cols) * CELL))
    buf = io.BytesIO()
    sheet.save(buf, 'WEBP', quality=70, method=6)
    data = buf.getvalue()
    digest = hashlib.sha256(data).hexdigest()[:10]
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    # Earlier immutable data revisions still refer to their content-addressed atlas.
    # Retain those public atlases so cached pages keep their matching portraits.
    (IMG_DIR / f'atlas-{digest}.webp').write_bytes(data)
    write_json(WEB_DATA / 'atlas.json', {'src': f'/img/atlas-{digest}.webp', 'size': CELL, 'cols': cols, 'count': len(cells), 'index': index}, compact=True)
    write_json(WEB_DATA / 'credits.json', {'note': 'Portraits of members of Congress: public domain (unitedstates/images). Other portraits: Wikimedia Commons under the listed licenses. Company and fund marks are trademarks of their owners, shown small for identification.',
                                           'items': credits}, compact=True)
    print(f'atlas: {len(cells)} cells, {cols}x{rows}, {len(data) // 1024} KB, subjects with image '
          f"{sum(1 for k in index if not k.startswith('logo:'))}/{len(graph['S'])}, tickers with logo {sum(1 for k in index if k.startswith('logo:'))}/{len(graph['T'])}")


if __name__ == '__main__':
    build()
