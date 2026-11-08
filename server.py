#!/usr/bin/env python3
"""Local SAT question bank server. Stdlib only.

    python3 server.py            -> http://127.0.0.1:8787
    python3 server.py 9000       -> custom port

Progress lives in data/sat.db (SQLite), so it survives restarts and crashes.
"""
import json, os, re, sqlite3, sys, random
from fractions import Fraction
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, 'data', 'sat.db')
STATIC = os.path.join(HERE, 'static')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8787

def db():
    con = sqlite3.connect(DB, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA journal_mode=WAL')
    return con

def to_number(s):
    s = str(s).strip().replace(',', '').replace(' ', '')
    if not s: return None
    try:
        if '/' in s:
            a, b = s.split('/', 1)
            return Fraction(a) / Fraction(b)
        return Fraction(s)
    except (ValueError, ZeroDivisionError):
        return None

def grade_spr(answer, keys):
    a = str(answer).strip()
    if not a: return False
    an = to_number(a)
    for k in keys:
        k = str(k).strip()
        if a.lower() == k.lower(): return True
        kn = to_number(k)
        if an is not None and kn is not None:
            if an == kn: return True
            # College Board accepts answers rounded or truncated to fit the box
            if abs(float(an) - float(kn)) < 0.0005 and ('.' in a or '.' in k): return True
    return False

def question_status_rows(con, section):
    rows = con.execute('''
      SELECT q.id, q.domain_cd, q.domain, q.skill_cd, q.skill, q.difficulty, q.band, q.type, q.ord, q.legacy, q.preview, q.video,
             (SELECT count(*) FROM attempts a WHERE a.question_id=q.id) AS attempts,
             (SELECT count(*) FROM attempts a WHERE a.question_id=q.id AND a.is_correct=1) AS corrects,
             (SELECT is_correct FROM attempts a WHERE a.question_id=q.id ORDER BY a.id DESC LIMIT 1) AS last_correct,
             (SELECT is_correct FROM attempts a WHERE a.question_id=q.id ORDER BY a.id ASC LIMIT 1) AS first_correct,
             (SELECT elapsed_ms FROM attempts a WHERE a.question_id=q.id ORDER BY a.id DESC LIMIT 1) AS last_ms,
             (SELECT elapsed_ms FROM attempts a WHERE a.question_id=q.id ORDER BY a.id ASC LIMIT 1) AS first_ms,
             (SELECT max(created_at) FROM attempts a WHERE a.question_id=q.id) AS last_at,
             (SELECT 1 FROM bookmarks b WHERE b.question_id=q.id) AS bookmarked
      FROM questions q WHERE q.section=? ORDER BY q.domain_cd, q.skill_cd, q.ord''', (section,)).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        if d['attempts'] == 0: st = 'new'
        elif d['last_correct']: st = 'solved'
        else: st = 'missed'
        d['status'] = st
        d['bookmarked'] = bool(d['bookmarked'])
        out.append(d)
    return out

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=STATIC, **kw)

    def end_headers(self):
        # Never cache the app files, so edits show up on a plain refresh.
        if not self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def log_message(self, fmt, *args):
        if '/api/' in (args[0] if args else ''): return
        super().log_message(fmt, *args)

    def send_json(self, obj, code=200):
        data = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def read_json(self):
        n = int(self.headers.get('Content-Length') or 0)
        return json.loads(self.rfile.read(n) or b'{}')

    def do_GET(self):
        u = urlparse(self.path)
        if not u.path.startswith('/api/'):
            if u.path in ('/', '/index.html') or not os.path.exists(os.path.join(STATIC, u.path.lstrip('/'))):
                self.path = '/index.html'
            return super().do_GET()
        qs = parse_qs(u.query)
        con = db()
        try:
            if u.path == '/api/meta':
                secs = {}
                for r in con.execute('SELECT section, domain_cd, domain, skill_cd, skill, count(*) n FROM questions GROUP BY 1,2,3,4,5 ORDER BY 1,2,4'):
                    s = secs.setdefault(r['section'], {'total': 0, 'domains': []})
                    s['total'] += r['n']
                    dom = next((d for d in s['domains'] if d['cd'] == r['domain_cd']), None)
                    if not dom:
                        dom = {'cd': r['domain_cd'], 'name': r['domain'], 'skills': [], 'total': 0}
                        s['domains'].append(dom)
                    dom['skills'].append({'cd': r['skill_cd'], 'name': r['skill'], 'total': r['n']})
                    dom['total'] += r['n']
                return self.send_json(secs)
            if u.path == '/api/questions':
                section = qs.get('section', ['math'])[0]
                return self.send_json(question_status_rows(con, section))
            if u.path.startswith('/api/question/'):
                qid = u.path.rsplit('/', 1)[1]
                r = con.execute('SELECT * FROM questions WHERE id=?', (qid,)).fetchone()
                if not r: return self.send_json({'error': 'not found'}, 404)
                d = dict(r); d['options'] = json.loads(d['options']); d['correct'] = json.loads(d['correct'])
                d.pop('search', None)
                d['attempts'] = [dict(a) for a in con.execute('SELECT answer, is_correct, elapsed_ms, created_at FROM attempts WHERE question_id=? ORDER BY id', (qid,))]
                d['bookmarked'] = bool(con.execute('SELECT 1 FROM bookmarks WHERE question_id=?', (qid,)).fetchone())
                return self.send_json(d)
            if u.path == '/api/settings':
                return self.send_json({r['key']: json.loads(r['value']) for r in con.execute('SELECT key, value FROM settings')})
            if u.path == '/api/stats':
                section = qs.get('section', ['math'])[0]
                rows = question_status_rows(con, section)
                by = {}
                for r in rows:
                    k = r['difficulty']; b = by.setdefault(k, {'total': 0, 'solved': 0, 'missed': 0})
                    b['total'] += 1; b[r['status']] = b.get(r['status'], 0) + 1
                total_ms = con.execute('SELECT coalesce(sum(elapsed_ms),0) FROM attempts a JOIN questions q ON q.id=a.question_id WHERE q.section=?', (section,)).fetchone()[0]
                return self.send_json({'byDifficulty': by, 'totalMs': total_ms, 'attempts': sum(r['attempts'] for r in rows)})
            return self.send_json({'error': 'unknown route'}, 404)
        finally:
            con.close()

    def do_POST(self):
        u = urlparse(self.path)
        body = self.read_json()
        con = db()
        try:
            if u.path == '/api/attempt':
                qid = body['question_id']
                r = con.execute('SELECT type, correct FROM questions WHERE id=?', (qid,)).fetchone()
                if not r: return self.send_json({'error': 'not found'}, 404)
                keys = json.loads(r['correct'])
                ans = str(body.get('answer', '')).strip()
                ok = (ans.upper() in keys) if r['type'] == 'mcq' else grade_spr(ans, keys)
                con.execute('INSERT INTO attempts(question_id, answer, is_correct, elapsed_ms) VALUES (?,?,?,?)',
                            (qid, ans, 1 if ok else 0, int(body.get('elapsed_ms') or 0)))
                con.commit()
                return self.send_json({'correct': ok, 'keys': keys})
            if u.path == '/api/bookmark':
                qid = body['question_id']
                if body.get('on'):
                    con.execute('INSERT OR IGNORE INTO bookmarks(question_id) VALUES (?)', (qid,))
                else:
                    con.execute('DELETE FROM bookmarks WHERE question_id=?', (qid,))
                con.commit()
                return self.send_json({'ok': True, 'bookmarked': bool(body.get('on'))})
            if u.path == '/api/reset':
                if body.get('question_id'):
                    con.execute('DELETE FROM attempts WHERE question_id=?', (body['question_id'],))
                elif body.get('section'):
                    con.execute('DELETE FROM attempts WHERE question_id IN (SELECT id FROM questions WHERE section=?)', (body['section'],))
                    if body.get('bookmarks'):
                        con.execute('DELETE FROM bookmarks WHERE question_id IN (SELECT id FROM questions WHERE section=?)', (body['section'],))
                con.commit()
                return self.send_json({'ok': True})
            if u.path == '/api/setting':
                con.execute('INSERT OR REPLACE INTO settings(key, value) VALUES (?,?)', (body['key'], json.dumps(body.get('value'))))
                con.commit()
                return self.send_json({'ok': True})
            return self.send_json({'error': 'unknown route'}, 404)
        finally:
            con.close()

if __name__ == '__main__':
    if not os.path.exists(DB):
        print('data/sat.db missing. Run: python3 build_db.py'); sys.exit(1)
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'SAT Bank running at http://127.0.0.1:{PORT}  (Ctrl+C to stop)')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
