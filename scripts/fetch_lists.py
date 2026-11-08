"""Download the College Board question lists (ids + metadata) for Math and Reading & Writing.
Usage: python3 scripts/fetch_lists.py data/raw
Then:  python3 scripts/fetch_questions.py data/raw math_list.json math
       python3 scripts/fetch_questions.py data/raw rw_list.json rw
       python3 build_db.py"""
import json, os, sys, urllib.request
base = sys.argv[1]; os.makedirs(base, exist_ok=True)
H = {'Content-Type': 'application/json', 'Origin': 'https://satsuiteeducatorquestionbank.collegeboard.org',
     'Referer': 'https://satsuiteeducatorquestionbank.collegeboard.org/', 'User-Agent': 'Mozilla/5.0'}
for name, test, domains in (('math_list.json', 2, 'H,P,Q,S'), ('rw_list.json', 1, 'INI,CAS,EOI,SEC')):
    body = json.dumps({'asmtEventId': 99, 'test': test, 'domain': domains}).encode()
    req = urllib.request.Request('https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions', data=body, headers=H, method='POST')
    with urllib.request.urlopen(req, timeout=60) as r: data = json.loads(r.read())
    json.dump(data, open(os.path.join(base, name), 'w'))
    print(name, len(data))
