import json, subprocess, sys, os, concurrent.futures, re
# usage: python3 dl.py index.json outdir
idx = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
FF = '/opt/homebrew/bin/ffmpeg'
def safe(s): return re.sub(r'[^A-Za-z0-9 _.,()&+-]+', '', s or '').strip()[:80]
def one(it):
    pid = it['id']; dst = os.path.join(out, pid + '.mp4')
    if os.path.exists(dst) and os.path.getsize(dst) > 50000: return (pid, 'skip')
    url = f"https://stream.mux.com/{it['video']}.m3u8?token={it['token']}"
    tmp = dst + '.part.mp4'
    r = subprocess.run([FF, '-loglevel', 'error', '-y', '-i', url, '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', '-bsf:a', 'aac_adtstoasc', tmp], capture_output=True, text=True, timeout=900)
    if os.path.exists(tmp) and os.path.getsize(tmp) > 50000:
        os.replace(tmp, dst); return (pid, 'ok')
    return (pid, 'fail ' + r.stderr[-200:])
items = [it for it in idx if it.get('video') and it.get('token')]
print('to download', len(items), flush=True)
done = 0; fails = []
with concurrent.futures.ThreadPoolExecutor(4) as ex:
    for pid, st in ex.map(one, items):
        done += 1
        if not st.startswith(('ok', 'skip')): fails.append((pid, st))
        if done % 25 == 0 or done == len(items): print(done, len(items), 'fails', len(fails), flush=True)
json.dump(fails, open(os.path.join(out, '_fails.json'), 'w'), indent=1)
print('DONE fails', len(fails))
