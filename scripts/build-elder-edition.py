#!/usr/bin/env python3
"""Assemble six public editions from the independently reviewed revision06 cycle."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'docs/storyboard'
PACK = WEB / 'production/chapters-02-04/revision-06/elder'
LANGS = ('en', 'ru', 'es')
PARTS = ('papa-home', 'family-morning', 'forest-path', 'elder-house', 'beneath-roots')
COUNTS = (15, 20, 22, 35, 69)
PREFIX = 'images/published/elder-cycle/'

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def localized(value):
    return isinstance(value, dict) and all(isinstance(value.get(l), str) and value[l].strip() for l in LANGS)

def assemble(allow_pending=False):
    chapter = json.loads((PACK / 'chapter.json').read_text())
    selection = json.loads((PACK / 'selected-images.json').read_text())
    if selection.get('pending') and not allow_pending:
        raise SystemExit('Independent review still pending: ' + ', '.join(selection['pending']))
    assert tuple(p['id'] for p in chapter['parts']) == PARTS
    registry = json.loads((WEB / 'covers.json').read_text())
    editions, full_scenes, full_spreads, nav = [], [], [], []
    for part, count in zip(chapter['parts'], COUNTS):
        pid, sid = part['id'], 'elder-' + part['id']
        source = [s for s in chapter['scenes'] if s['part'] == pid]
        assert len(source) == count, (pid, len(source), count)
        assert localized(part['title'])
        cover = {l: PREFIX + pid + '-title-' + l + '.webp' for l in LANGS}
        alt = {l: {'en': 'Title page: ', 'ru': 'Титульная страница: ', 'es': 'Portada: '}[l] + part['title'][l] for l in LANGS}
        scenes = [{'id': sid + '-title', 'part': pid, 'role': 'title', 'image': cover['en'], 'images': cover,
                   'width': 1024, 'height': 1536, 'alt': alt, 'paragraphs': {l: [] for l in LANGS}}]
        for scene in source:
            assert localized(scene['alt'])
            assert all(isinstance(scene['text'][l], list) and scene['text'][l] and
                       all(isinstance(p, str) and p.strip() for p in scene['text'][l]) for l in LANGS)
            scenes.append({'id': scene['id'], 'part': pid, 'image': PREFIX + scene['id'] + '.webp',
                           'width': scene['width'], 'height': scene['height'],
                           'alt': scene['alt'], 'paragraphs': scene['text']})
        spreads = [{'style': 'cover' if i == 0 else 'elder', 'paper': 'portrait' if i == 0 else 'landscape',
                    'scenes': [i]} for i in range(len(scenes))]
        nav.append({'id': pid, 'number': PARTS.index(pid) + 1, 'title': part['title'], 'startScene': len(full_scenes), 'storyId': sid})
        edition = {'id': sid, 'editionVersion': 1, 'sourceChapter': 'chapter-02', 'title': part['title'],
                   'cover': cover, 'miniature': PREFIX + pid + '-miniature.webp',
                   'scenes': scenes, 'spreads': spreads, 'chapterNav': [dict(nav[-1], startScene=0)]}
        editions.append(edition)
        offset = len(full_scenes)
        full_scenes.extend(scenes)
        full_spreads.extend([{**spread, 'scenes': [offset + spread['scenes'][0]]} for spread in spreads])
        registry['covers'][sid] = {'route': {'story': sid}, 'status': 'approved', 'version': 1,
          'width': 1024, 'height': 1536, 'placement': 'replace', 'title': part['title'], 'assets': cover, 'alt': alt,
          'miniature': {'status': 'approved', 'version': 1, 'width': 1024, 'height': 1536,
                        'asset': edition['miniature'], 'textFree': True, 'languageIndependent': True}}
    cycle = {'id': 'one-day-in-the-forest', 'editionVersion': 1, 'sourceChapter': 'chapter-02',
             'title': chapter['title'], 'cover': editions[0]['cover'], 'miniature': editions[0]['miniature'],
             'scenes': full_scenes, 'spreads': full_spreads, 'chapterNav': nav}
    assert len(cycle['scenes']) == 166
    registry['covers'][cycle['id']] = {**registry['covers']['elder-papa-home'],
                                       'route': {'story': cycle['id']}, 'title': chapter['title']}
    for edition in [cycle, *editions]:
        write(WEB / 'stories' / (edition['id'] + '.json'), edition)
    write(WEB / 'covers.json', registry)
    print('Assembled cycle166 + part editions16/21/23/36/70; ' + ('DRAFT pending review' if selection.get('pending') else 'all scene reviews ready'))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--allow-pending', action='store_true', help='Build local integration draft before final QA; never use for release.')
    assemble(parser.parse_args().allow_pending)
