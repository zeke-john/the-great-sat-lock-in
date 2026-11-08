import json, os, sys, time, concurrent.futures as cf, urllib.request
base = sys.argv[1]
lst = json.load(open(os.path.join(base,sys.argv[2])))
out = os.path.join(base,sys.argv[3]); os.makedirs(out, exist_ok=True)
H = {'Content-Type':'application/json','Origin':'https://satsuiteeducatorquestionbank.collegeboard.org','Referer':'https://satsuiteeducatorquestionbank.collegeboard.org/','User-Agent':'Mozilla/5.0'}
def fetch(q):
    qid=q['questionId']; p=os.path.join(out,qid+'.json')
    if os.path.exists(p): return 'skip'
    for attempt in range(4):
        try:
            if q.get('external_id'):
                req=urllib.request.Request('https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question',data=json.dumps({'external_id':q['external_id']}).encode(),headers=H,method='POST')
            else:
                req=urllib.request.Request(f"https://saic.collegeboard.org/disclosed/{q['ibn']}.json",headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req,timeout=30) as r: data=r.read()
            json.loads(data)
            open(p,'wb').write(data); return 'ok'
        except Exception as e:
            err=str(e); time.sleep(1.5*(attempt+1))
    return 'fail '+qid+' '+err
with cf.ThreadPoolExecutor(8) as ex:
    res=list(ex.map(fetch,lst))
import collections; print(collections.Counter(r.split()[0] for r in res)); print([r for r in res if r.startswith('fail')][:20])
