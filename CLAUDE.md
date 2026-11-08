# sat-bank (the great sat lock in, mission 1600)

Local SAT practice site. Read `README.md` first: it explains what this is, how to run it,
the file layout, and the behaviors that must not change. `scripts/BEDROCK.md` covers the
Bedrock scraping details.

## Working rules (from Zeke, learned the hard way)

- The question page (`#/q/<id>`) is a literal Bluebook copy. **Never add keyboard shortcuts
  there.** The real SAT has none.
- Reuse the UI that exists. Do not invent new chrome, labels, or hints. When in doubt, copy
  Bedrock (browse page) or Bluebook (question page) exactly.
- Verify every state in the browser before showing it. Open http://127.0.0.1:8787 yourself.
- The 📝 Plan page is insights only: what was on the Nov 7, 2026 SAT at full detail, then a
  short Bluebook summary. No study schedules, no pacing advice (he already follows James Lu's).
- Zeke's progress lives in `data/sat.db` (tables `attempts`, `bookmarks`, `settings`).
  Never drop those tables. If you create test attempts while verifying, delete them after.
- Public repo: https://github.com/zeke-john/the-great-sat-lock-in. Code only. `data/`,
  `static/bedrock/`, `static/videos/*.mp4`, `static/ref.png` are git-ignored on purpose
  (College Board and Bedrock content). Keep it that way. `gh` is logged in as zeke-john.

## Run / restart

    pkill -f "sat-bank/server.py"; pkill -f "Python server.py"
    cd ~/sat-bank && (nohup python3 server.py > server.log 2>&1 &)

Static files are served with no-store, so a browser refresh picks up edits. `server.py`
itself needs the restart above. Rebuild the database with `python3 build_db.py` (it keeps
progress and re-runs `import_bedrock.py`).

## Where things are

- `server.py` API, `build_db.py` + `import_bedrock.py` data, `static/app.js` the whole SPA,
  `static/styles.css`, `static/plan.html`, `static/index.html`.
- Raw data: `data/raw/*.json` (College Board) and `data/raw/bedrock_problems.json` (1,006
  Bedrock problems with solutions). Figures in `static/bedrock/`, videos in `static/videos/`.
- Bank sizes as of Nov 8, 2026: Math 2,931 (1,925 College Board + 1,006 Bedrock), RW 1,845.
