"""Add Bedrock problems that have video solutions to the bank (data/raw/bedrock_videos.json).
Run after build_db.py; safe to re-run. Progress tables are untouched."""
import json, os, re, sqlite3, html
HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, 'data', 'sat.db'); SRC = os.path.join(HERE, 'data', 'raw', 'bedrock_videos.json')
DOMAIN = {'Algebra': ('H', 'Algebra'), 'Advanced Math': ('P', 'Advanced Math'),
          'Problem-Solving & Data Analysis': ('Q', 'Problem-Solving and Data Analysis'), 'Geometry & Trigonometry': ('S', 'Geometry and Trigonometry')}
# Bedrock topic -> (skill_cd, skill)
TOPIC = {'Functions': ('P.C.', 'Nonlinear functions'), 'Linear Functions': ('H.B.', 'Linear functions'),
         'Systems of Equations & Inequalities': ('H.D.', 'Systems of two linear equations in two variables'),
         'Algebra with Desmos': ('H.A.', 'Linear equations in one variable'), 'Quadratics & Polynomials': ('P.B.', 'Nonlinear equations in one variable and systems of equations in two variables'),
         'Exponential Growth': ('P.C.', 'Nonlinear functions'), 'Rates & Units': ('Q.A.', 'Ratios, rates, proportional relationships, and units'),
         'Statistics': ('Q.C.', 'One-variable data: Distributions and measures of center and spread'),
         'Angles & Triangles': ('S.B.', 'Lines, angles, and triangles'), 'Area, Surface Area, Volume': ('S.A.', 'Area and volume'), 'Circles': ('S.D.', 'Circles')}
TRIG = re.compile(r'sine|cosine|tangent|cofunction|unit circle|radian|soh|trig|pythag|special right', re.I)
def text(h): return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h or ''))).strip()
def main():
    items = json.load(open(SRC))
    con = sqlite3.connect(DB); c = con.cursor()
    cols = [r[1] for r in c.execute('PRAGMA table_info(questions)')]
    if 'video' not in cols: c.execute('ALTER TABLE questions ADD COLUMN video TEXT')
    if 'bedrock' not in cols: c.execute('ALTER TABLE questions ADD COLUMN bedrock TEXT')
    c.execute("DELETE FROM questions WHERE legacy=2")
    skills = {r[0]: r[1] for r in c.execute('SELECT skill_cd, skill FROM questions GROUP BY 1')}
    n = 0
    for it in items:
        dom_cd, dom = DOMAIN.get(it['domainName'], ('P', 'Advanced Math'))
        byname = {v: k for k, v in skills.items()}
        sk = it.get('skill_cd') or byname.get((it.get('cb_skill_name') or '').strip())
        if not sk or sk not in skills:
            sk = TOPIC.get(it['topicName'], ('P.C.', 'Nonlinear functions'))[0]
            if it['topicName'] == 'Angles & Triangles' and TRIG.search(it['title']): sk = 'S.C.'
            if it['topicName'] == 'Statistics' and re.search(r'probab', it['title'], re.I): sk = 'Q.E.'
            if it['topicName'] == 'Statistics' and re.search(r'scatter|line of best|regression', it['title'], re.I): sk = 'Q.D.'
            if it['topicName'] == 'Exponential Growth' and it['domainName'].startswith('Problem'): sk = 'Q.B.'
        skill = skills.get(sk, sk)
        # keep the skill's own domain so sidebar counts line up
        row = c.execute('SELECT domain_cd, domain FROM questions WHERE skill_cd=? LIMIT 1', (sk,)).fetchone()
        if row: dom_cd, dom = row
        diff = {'easy': 'E', 'medium': 'M', 'hard': 'H'}[it['difficulty']]
        typ = 'spr' if it['input'] else 'mcq'
        opts = [{'label': ch['letter'], 'html': ch['html']} for ch in it['choices']] if typ == 'mcq' else []
        correct = it['answer'] if isinstance(it['answer'], list) else [it['answer']]
        stem = it['stem']
        figs = ''.join(f'<div class="bb-fig">{f}</div>' for f in it.get('figs', []))
        stimulus = figs
        rationale = f"<p><b>Answer:</b> {html.escape(', '.join(correct))}. From Bedrock problem {it['label']} “{html.escape(it['title'])}”. Watch the video for the worked solution.</p>"
        prev = text(stem); prev = prev if len(prev) <= 160 else prev[:157].rsplit(' ', 1)[0] + '…'
        search = (it['title'] + ' ' + text(stem) + ' ' + ' '.join(text(o['html']) for o in opts)).lower()
        ordn = (c.execute('SELECT coalesce(max(ord),0) FROM questions WHERE skill_cd=?', (sk,)).fetchone()[0] or 0) + 1
        c.execute('INSERT INTO questions(id,section,domain_cd,domain,skill_cd,skill,difficulty,band,type,stimulus,stem,options,correct,rationale,legacy,unknown,ord,search,preview,video,bedrock) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                  (it['id'], 'math', dom_cd, dom, sk, skill, diff, {'E': 3, 'M': 5, 'H': 7}[diff], typ, stimulus, stem, json.dumps(opts), json.dumps(correct), rationale, 2, 0, ordn, search, prev, it['video'], json.dumps({'label': it['label'], 'title': it['title'], 'topic': it['topicName'], 'url': 'https://www.bedrockprep.com/problems/' + it['id']})))
        n += 1
    con.commit()
    for r in c.execute("SELECT skill_cd, count(*) FROM questions WHERE legacy=2 GROUP BY 1 ORDER BY 1"): print(r)
    print('imported', n); con.close()
if __name__ == '__main__': main()
