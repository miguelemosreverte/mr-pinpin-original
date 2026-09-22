#!/usr/bin/env python3
"""Serve the local chapter proposals; use legacy assets from the sibling sparse fallback."""
from argparse import ArgumentParser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit

parser = ArgumentParser()
parser.add_argument('--port', type=int, default=8782)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
primary = repo / 'docs'
legacy = repo.parent / 'mr-pinpin-original' / 'docs'

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, request_path):
        relative = Path(unquote(urlsplit(request_path).path).lstrip('/'))
        if '..' in relative.parts:
            return str(primary / '__invalid_path__')
        candidate = primary / relative
        if candidate.exists() or not legacy.is_dir():
            return str(candidate)
        return str(legacy / relative)

print(f'Chapter workshop: http://127.0.0.1:{args.port}/storyboard/review/chapter-workshop.html', flush=True)
ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
