# the great sat lock in — mission 1600

A local SAT practice site built in one night (Nov 7–8, 2026) for a four-week push to 1400+.
Every released College Board question (1,925 Math, 1,845 Reading & Writing) in a browse page
styled like Bedrock, with a question screen that is a one-to-one copy of Bluebook, plus the
whole Bedrock math bank (1,006 problems with their written solutions, 100 of them with video).

Runs on `localhost` only. Progress lives in a SQLite file on the machine.

## Run it

    ./start.command            # or: python3 server.py

Open http://127.0.0.1:8787. Python 3 only, no dependencies, no build step.

The first run needs the question data (not in this repo, see below). `start.command`
builds the database automatically once `data/raw/` exists.

## Get the data (not committed)

The questions are College Board's copyrighted content and the videos are Bedrock's paid
content, so `data/` and the media folders are git-ignored. Rebuild them locally:

    python3 scripts/fetch_lists.py data/raw                       # ids + metadata
    python3 scripts/fetch_questions.py data/raw math_list.json math
    python3 scripts/fetch_questions.py data/raw rw_list.json rw
    python3 build_db.py                                          # -> data/sat.db

Optional: the official reference sheet image goes at `static/ref.png` (any copy of the
SAT math reference sheet works). Optional: Bedrock videos, see `scripts/BEDROCK.md`.

## Layout

- `server.py` — stdlib HTTP server + JSON API on port 8787 (`/api/questions`, `/api/question/<id>`,
  `/api/attempt`, `/api/bookmark`, `/api/reset`, `/api/setting`). Static files are served with
  `Cache-Control: no-store`.
- `build_db.py` — normalizes `data/raw/` into the `questions` table. Progress tables
  (`attempts`, `bookmarks`, `settings`) are never dropped. Numbers questions easiest → hardest
  within each skill. Calls `import_bedrock.py` at the end.
- `import_bedrock.py` — adds the Bedrock problems from `data/raw/bedrock_problems.json`
  (`legacy = 2`, `video` and `bedrock` columns) into the matching skill, rendering their
  markdown solutions (KaTeX math, Desmos code blocks) into the explanation box.
- `static/app.js` — vanilla JS single-page app. Routes: `#/`, `#/math`, `#/rw`, `#/plan`,
  `#/math/s/<skill>`, `#/math/d/<domain>`, `#/q/<id>`.
- `static/styles.css` — Bedrock-style browse (cream background, 56px tiles with hard offset
  shadows) + Bluebook block (`.bb-*`).
- `static/plan.html` — the notes page (📝 at the top right): what showed up on the
  Nov 7, 2026 SAT per Reddit/YouTube, plus Bluebook practice-test miss patterns.
- `static/videos/` — index page + `videos.json` for the Bedrock videos (mp4s ignored).
- `scripts/` — data fetchers, the video downloader, and Bedrock notes.

## How the site behaves (decisions worth keeping)

- Browse page: tiles grouped domain → skill → difficulty. Sticky toolbar with Easy / Medium /
  Hard / Video chips, a view dropdown (Topic, Difficulty, By time, Bookmarked, Missed) and
  Practice. Section headings and skill blocks are sticky too. Each skill has its own Practice
  button: a shuffled run of that skill's unsolved questions. The top Practice button does the
  same for everything currently shown.
- Question page: exact Bluebook look. Header shows skill and difficulty. Count-up timer with
  Hide. Calculator (Desmos, College Board version) and Reference open as floating, draggable
  windows; with the calculator open the question column starts just right of the timer colon
  and does not move when the window is dragged. Cross-out (ABC) is on by default. **No keyboard
  shortcuts on this screen, on purpose.** Check Answer stops the timer and shows the result,
  explanation and, for Bedrock problems, the video. "History · n" in the question bar lists
  every attempt with time and answer. Nothing is auto-revealed on reopening a question.
- Status: solved once the latest attempt is correct, missed while it is wrong. "By time"
  uses the first attempt's time.
- Bedrock problems carry a small B badge and have their own Bedrock chip filter; the ones
  with a video are gold with a play badge and also match the Video chip.

## For future threads

Keep the question screen a literal Bluebook copy. Reuse existing UI instead of adding new
chrome. Verify every change in the browser before showing it. The Plan page is insights
only, no study schedules. Details of the Reddit/Bluebook/Bedrock scraping live in
`scripts/BEDROCK.md` and the commit history.
