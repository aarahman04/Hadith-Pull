"""Local static preview with GitHub Pages-style clean HTML routes. No production mutations."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
import os

os.chdir(Path(__file__).resolve().parents[1])
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlsplit(self.path)
        if not Path(parsed.path.lstrip('/')).suffix and Path(parsed.path.lstrip('/') + '.html').is_file():
            self.path = parsed.path + '.html' + ('?' + parsed.query if parsed.query else '')
        super().do_GET()

ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
