"""Add Bedrock math problems to the bank from data/raw/bedrock_problems.json.
Runs at the end of build_db.py; safe to re-run. Progress tables are untouched."""
import json, os, re, sqlite3, html
HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, 'data', 'sat.db')
SRC = os.path.join(HERE, 'data', 'raw', 'bedrock_problems.json')
if not os.path.exists(SRC): SRC = os.path.join(HERE, 'data', 'raw', 'bedrock_videos.json')
TOPIC = {'Functions': 'P.C.', 'Linear Functions': 'H.B.', 'Systems of Equations & Inequalities': 'H.D.', 'Algebra with Desmos': 'H.A.',
         'Quadratics & Polynomials': 'P.B.', 'Exponential Growth': 'P.C.', 'Rates & Units': 'Q.A.', 'Statistics': 'Q.C.',
         'Angles & Triangles': 'S.B.', 'Area, Surface Area, Volume': 'S.A.', 'Circles': 'S.D.', 'Percentages': 'Q.B.',
         'Probability': 'Q.E.', 'Inequalities': 'H.E.', 'Linear Equations': 'H.A.', 'Absolute Value': 'P.B.', 'Polynomials': 'P.A.',
         'Exponents & Radicals': 'P.A.', 'Scatterplots & Regressions': 'Q.D.', 'Data & Statistics': 'Q.C.', 'Trigonometry': 'S.C.'}
TRIG = re.compile(r'sine|cosine|tangent|cofunction|unit circle|radian|\btrig|pythag|special right|soh', re.I)
def text(h): return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h or ''))).strip()
def unescape_json(s):
    try: return json.loads('"' + s + '"')
    except Exception: return s.replace('\\n', '\n').replace('\\"', '"')
def inline(t):
    maths = []
    t = re.sub(r'\$\$.*?\$\$|\$[^$\n]+\$', lambda m: maths.append(m.group(0)) or '@@M%d@@' % (len(maths) - 1), t, flags=re.S)
    t = html.escape(t, quote=False)
    t = re.sub(r'@@M(\d+)@@', lambda m: maths[int(m.group(1))], t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<i>\1</i>', t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    return re.sub(r'\s*\n\s*', ' ', t)
def md2html(md):
    md = unescape_json(md or '')
    md = re.sub(r'\n?</?(content|invoke)>\s*', '\n', md).strip()
    out = []
    # pull fenced code blocks (Bedrock uses ```desmos for expressions to type into the calculator) out first
    fences = []
    def _fence(m):
        fences.append(((m.group(1) or '').strip(), m.group(2).strip())); return '\n\n@@FENCE%d@@\n\n' % (len(fences) - 1)
    md = re.sub(r'```([a-zA-Z]*)\n(.*?)```', _fence, md, flags=re.S)
    for block in re.split(r'\n\s*\n', md):
        b = block.strip()
        if not b: continue
        fm = re.match(r'^@@FENCE(\d+)@@$', b)
        if fm:
            lang, code = fences[int(fm.group(1))]
            label = 'Type into Desmos' if lang == 'desmos' else (lang or 'Code')
            out.append(f'<div class="dz"><div class="dzl">{html.escape(label)}</div><pre>{html.escape(code)}</pre></div>'); continue
        if b.startswith('$$') and b.endswith('$$'): out.append(f'<p>{html.escape(b, quote=False)}</p>'); continue
        lines = b.split('\n')
        UL = re.compile(r'^\s*[-*]\s+'); OL = re.compile(r'^\s*\d+[.)]\s+')
        if all(UL.match(l) for l in lines):
            out.append('<ul>' + ''.join('<li>' + inline(UL.sub('', l)) + '</li>' for l in lines) + '</ul>'); continue
        if all(OL.match(l) for l in lines):
            out.append('<ol>' + ''.join('<li>' + inline(OL.sub('', l)) + '</li>' for l in lines) + '</ol>'); continue
        m = re.match(r'^#{1,4}\s+(.*)', b)
        if m: out.append(f'<p><b>{inline(m.group(1))}</b></p>'); continue
        out.append(f'<p>{inline(b)}</p>')
    return ''.join(out)
def pick_skill(it, skills, byname):
    sk = byname.get((it.get('cb_skill_name') or '').strip())
    if sk: return sk
    topic = it.get('topicName') or ''; title = it.get('title') or ''; dom = it.get('domainName') or ''
    sk = TOPIC.get(topic)
    if topic == 'Angles & Triangles' and TRIG.search(title): sk = 'S.C.'
    if topic == 'Statistics' and re.search(r'probab', title, re.I): sk = 'Q.E.'
    if topic == 'Statistics' and re.search(r'scatter|line of best|regression', title, re.I): sk = 'Q.D.'
    if topic == 'Statistics' and re.search(r'margin of error|sample|survey|random', title, re.I): sk = 'Q.F.'
    if topic == 'Exponential Growth' and dom.startswith('Problem'): sk = 'Q.B.'
    if topic == 'Rates & Units' and re.search(r'percent', title, re.I): sk = 'Q.B.'
    if topic in ('Functions', 'Algebra with Desmos') and dom == 'Algebra' and re.search(r'linear|slope|intercept|line\b', title, re.I): sk = 'H.B.'
    if topic == 'Quadratics & Polynomials' and re.search(r'vertex|parabola|graph|function|maximum|minimum|transform', title, re.I): sk = 'P.C.'
    if topic == 'Quadratics & Polynomials' and re.search(r'factor|expand|equivalent|expression|simplif', title, re.I): sk = 'P.A.'
    if topic == 'Systems of Equations & Inequalities' and re.search(r'inequalit', title, re.I): sk = 'H.E.'
    if topic == 'Systems of Equations & Inequalities' and dom == 'Advanced Math': sk = 'P.B.'
    return sk if sk in skills else 'P.C.'
def main():
    items = json.load(open(SRC))
    con = sqlite3.connect(DB); c = con.cursor()
    cols = [r[1] for r in c.execute('PRAGMA table_info(questions)')]
    if 'video' not in cols: c.execute('ALTER TABLE questions ADD COLUMN video TEXT')
    if 'bedrock' not in cols: c.execute('ALTER TABLE questions ADD COLUMN bedrock TEXT')
    c.execute('DELETE FROM questions WHERE legacy=2')
    skills = {r[0]: r[1] for r in c.execute('SELECT skill_cd, skill FROM questions GROUP BY 1')}
    byname = {v: k for k, v in skills.items()}
    doms = {r[0]: (r[1], r[2]) for r in c.execute('SELECT skill_cd, domain_cd, domain FROM questions GROUP BY 1')}
    nextord = {r[0]: r[1] for r in c.execute('SELECT skill_cd, max(ord) FROM questions GROUP BY 1')}
    n = 0; per = {}
    for it in sorted(items, key=lambda x: (int(re.sub(r'\D', '', str(x.get('label') or '0')) or 0), x['id'])):
        sk = pick_skill(it, skills, byname); dom_cd, dom = doms[sk]
        diff = {'easy': 'E', 'medium': 'M', 'hard': 'H', 'expert': 'H'}.get(it.get('difficulty'), 'M')
        typ = 'spr' if it.get('input') else 'mcq'
        opts = [{'label': ch['letter'], 'html': ch['html']} for ch in it['choices']] if typ == 'mcq' else []
        ans = it['answer']; correct = ans if isinstance(ans, list) else [str(ans)]
        stimulus = ''.join(f'<div class="bb-fig">{f}</div>' for f in it.get('figs', []))
        sol = md2html(it.get('sol') or '')
        rationale = f'<div class="sol">{sol or "<p><b>Answer:</b> " + html.escape(", ".join(correct)) + "</p>"}<p class="src">Bedrock problem {html.escape(str(it.get("label") or ""))} · {html.escape(it.get("title") or "")} · {html.escape(it.get("topicName") or "")}</p></div>'
        stem = it['stem']; prev = text(stem); prev = prev if len(prev) <= 160 else prev[:157].rsplit(' ', 1)[0] + '…'
        search = ((it.get('title') or '') + ' ' + text(stem) + ' ' + ' '.join(text(o['html']) for o in opts)).lower()
        nextord[sk] = (nextord.get(sk) or 0) + 1
        c.execute('INSERT INTO questions(id,section,domain_cd,domain,skill_cd,skill,difficulty,band,type,stimulus,stem,options,correct,rationale,legacy,unknown,ord,search,preview,video,bedrock) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                  (it['id'], 'math', dom_cd, dom, sk, skills[sk], diff, {'E': 3, 'M': 5, 'H': 7}[diff], typ, stimulus, stem, json.dumps(opts), json.dumps(correct), rationale, 2, 0, nextord[sk], search, prev,
                   (it['id'] + '.mp4') if it.get('video') else None, json.dumps({'label': it.get('label'), 'title': it.get('title'), 'topic': it.get('topicName'), 'url': 'https://www.bedrockprep.com/problems/' + it['id']})))
        n += 1; per[sk] = per.get(sk, 0) + 1
    con.commit()
    for k in sorted(per): print(k, per[k])
    print('imported', n, 'with video', sum(1 for it in items if it.get('video'))); con.close()
if __name__ == '__main__': main()
