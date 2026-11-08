#!/usr/bin/env python3
"""Normalize the raw College Board question JSON into data/sat.db.

Run once (or again after re-downloading). Progress tables are never dropped.
"""
import json, os, re, sqlite3, sys, html

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'data', 'raw')
DB = os.path.join(HERE, 'data', 'sat.db')
LETTERS = 'ABCD'

import xml.etree.ElementTree as ET

def _fix_mfenced(el):
    for i, ch in enumerate(list(el)):
        _fix_mfenced(ch)
        if ch.tag == 'mfenced':
            row = ET.Element('mrow')
            o = ET.SubElement(row, 'mo'); o.text = ch.get('open', '(')
            seps = ch.get('separators', ',').replace(' ', '') or ','
            kids = list(ch)
            for j, k in enumerate(kids):
                row.append(k)
                if j < len(kids) - 1:
                    s = ET.SubElement(row, 'mo'); s.text = seps[min(j, len(seps) - 1)]
            cl = ET.SubElement(row, 'mo'); cl.text = ch.get('close', ')')
            row.tail = ch.tail
            el.remove(ch); el.insert(i, row)

def fix_math(h):
    """Browsers' MathML Core dropped <mfenced>; rewrite it as mrow/mo so parentheses render."""
    if not h or '<mfenced' not in h: return h
    def repl(m):
        block = m.group(0)
        try:
            root = ET.fromstring(block)
        except ET.ParseError:
            return re.sub(r'<mfenced[^>]*>', '<mrow><mo>(</mo>', block).replace('</mfenced>', '<mo>)</mo></mrow>')
        _fix_mfenced(root)
        return ET.tostring(root, encoding='unicode')
    return re.sub(r'<math\b.*?</math>', repl, h, flags=re.S)

def strip_ns(h):
    if not h: return ''
    h = re.sub(r'\s+xmlns(:\w+)?="[^"]*"', '', h)
    return fix_math(h.strip())

def text(h):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h or ''))).strip()

def parse_new(d):
    """Modern format: stem/stimulus html, answerOptions, keys, rationale."""
    typ = d.get('type')
    opts = []
    correct = []
    if typ == 'mcq':
        ids = [o['id'] for o in d.get('answerOptions', [])]
        opts = [{'label': LETTERS[i], 'html': strip_ns(o.get('content', ''))} for i, o in enumerate(d.get('answerOptions', []))]
        for k in d.get('keys') or []:
            if k in ids: correct.append(LETTERS[ids.index(k)])
        if not correct:
            for k in d.get('correct_answer') or []:
                k = str(k).strip().upper()
                if k in LETTERS: correct.append(k)
    else:
        typ = 'spr'
        correct = [str(k).strip() for k in (d.get('keys') or d.get('correct_answer') or [])]
    return dict(type=typ, stimulus=strip_ns(d.get('stimulus', '')), stem=strip_ns(d.get('stem', '')),
                options=opts, correct=correct, rationale=strip_ns(d.get('rationale', '')), legacy=0)

def parse_legacy(d):
    """Older 'ibn' format from saic.collegeboard.org: body/prompt/answer{choices,correct_choice}."""
    it = d[0] if isinstance(d, list) else d
    a = it.get('answer', {})
    rationale = strip_ns(a.get('rationale', ''))
    unknown = 0
    if a.get('style') == 'Multiple Choice':
        typ = 'mcq'
        ch = a.get('choices', {})
        opts = [{'label': k.upper(), 'html': strip_ns(v.get('body', ''))} for k, v in sorted(ch.items())]
        cc = a.get('correct_choice')
        if cc: correct = [cc.upper()]
        else:
            m = re.search(r'Choice ([A-D]) is correct', text(rationale))
            correct = [m.group(1)] if m else []
            unknown = 0 if m else 1
    else:
        typ = 'spr'; opts = []
        m = re.search(r'correct answer is ([^.,;]*?[0-9/.\-]+[^ .,;]*)', text(rationale))
        correct = [m.group(1).strip().rstrip('.')] if m else []
        if not correct: unknown = 1
    return dict(type=typ, stimulus=strip_ns(it.get('body', '')), stem=strip_ns(it.get('prompt', '')),
                options=opts, correct=correct, rationale=rationale, legacy=1, unknown=unknown)

def main():
    con = sqlite3.connect(DB)
    c = con.cursor()
    c.executescript('''
    DROP TABLE IF EXISTS questions;
    CREATE TABLE questions(
      id TEXT PRIMARY KEY, section TEXT, domain_cd TEXT, domain TEXT, skill_cd TEXT, skill TEXT,
      difficulty TEXT, band INTEGER, type TEXT, stimulus TEXT, stem TEXT, options TEXT, correct TEXT,
      rationale TEXT, legacy INTEGER, unknown INTEGER, ord INTEGER, search TEXT, preview TEXT);
    CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY AUTOINCREMENT, question_id TEXT, answer TEXT,
      is_correct INTEGER, elapsed_ms INTEGER, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS bookmarks(question_id TEXT PRIMARY KEY, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
    CREATE INDEX IF NOT EXISTS attempts_q ON attempts(question_id);
    ''')
    total = 0
    for section, listfile, folder in (('math', 'math_list.json', 'math'), ('rw', 'rw_list.json', 'rw')):
        lst = json.load(open(os.path.join(RAW, listfile)))
        pending = []
        for q in lst:
            path = os.path.join(RAW, folder, q['questionId'] + '.json')
            if not os.path.exists(path):
                print('missing', q['questionId']); continue
            d = json.load(open(path))
            p = parse_legacy(d) if q.get('ibn') else parse_new(d)
            skill = q['skill_desc'].strip()
            if skill == 'Cross-text Connections': skill = 'Cross-Text Connections'
            prev = (text(p['stimulus']) + ' ' + text(p['stem'])).strip()
            if len(prev) > 160: prev = prev[:157].rsplit(' ', 1)[0] + '…'
            search = text(p['stimulus']) + ' ' + text(p['stem']) + ' ' + ' '.join(text(o['html']) for o in p['options'])
            pending.append((q, p, skill, prev, search))
        # number questions within each skill from easiest to hardest; ties broken by id so numbering is stable
        band = lambda q: (int(q.get('score_band_range_cd') or 0), 'EMH'.index(q['difficulty']) if q['difficulty'] in 'EMH' else 9, q['questionId'])
        by_skill = {}
        for item in pending: by_skill.setdefault(item[2], []).append(item)
        for skill, items in by_skill.items():
            items.sort(key=lambda it: band(it[0]))
            for n, (q, p, skill, prev, search) in enumerate(items, 1):
                c.execute('INSERT INTO questions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', (
                    q['questionId'], section, q['primary_class_cd'], q['primary_class_cd_desc'].strip(), q['skill_cd'].strip(), skill,
                    q['difficulty'], q.get('score_band_range_cd'), p['type'], p['stimulus'], p['stem'],
                    json.dumps(p['options']), json.dumps(p['correct']), p['rationale'], p['legacy'], p.get('unknown', 0),
                    n, search.lower(), prev))
                total += 1
    con.commit()
    print('questions:', total)
    for row in c.execute('SELECT section, type, legacy, count(*) FROM questions GROUP BY 1,2,3'): print(row)
    print('answer unknown:', c.execute('SELECT count(*) FROM questions WHERE unknown=1').fetchone()[0])
    print('no correct:', c.execute("SELECT count(*) FROM questions WHERE correct='[]'").fetchone()[0])
    con.close()

if __name__ == '__main__':
    main()
    try:
        import import_bedrock; import_bedrock.main()
    except Exception as e: print('bedrock import skipped:', e)
