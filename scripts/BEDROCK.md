# Bedrock video solutions (optional, needs a Bedrock Pro login)

Bedrock hosts its solution videos on Mux. Only ~127 of its ~1,030 problems have one
(100 problem walkthroughs + 27 Desmos guide videos as of Nov 2026). Everything here must run
inside a browser tab that is logged in to bedrockprep.com, because the video-token endpoint
uses the session cookie.

1. Each problem page's RSC payload (`fetch('/problems/<id>', {headers: {RSC: '1'}})`)
   contains `"video":"<muxPlaybackId>"` when a video exists, plus `choices`, `answer`
   (a string, or an array of accepted answers for grid-ins) and `solutionMarkdown`.
   The same payload has a `"problems":[...]` array with every problem's id, label,
   topicName, domainName and difficulty.
2. A signed playback token comes from `GET /api/video-token?playbackId=<id>` (JSON
   `{playback: <jwt>}`, valid a few hours). The stream URL is
   `https://stream.mux.com/<id>.m3u8?token=<jwt>`.
3. `python3 scripts/download_bedrock_videos.py index.json static/videos` downloads each
   `{id, video, token}` entry with ffmpeg (`brew install ffmpeg`) to `static/videos/<id>.mp4`.
4. For the question text, load each problem in a same-origin iframe and copy the rendered
   HTML: stem = `article div.mt-6.text-lg`, choices = `section ul li .md-choice`,
   grid-in = an `<input>` inside the section, figures = `article img` or a large `svg`.
   Save as `data/raw/bedrock_videos.json` (fields are read by `import_bedrock.py`), then run
   `python3 import_bedrock.py` (it also runs automatically at the end of `build_db.py`).

Imported questions get `legacy = 2`, a `video` column, gold tiles and the Video chip filter.
