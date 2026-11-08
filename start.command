#!/bin/bash
# Double-click this file in Finder to start SAT Bank, or run ./start.command in a terminal.
cd "$(dirname "$0")"
[ -f data/sat.db ] || python3 build_db.py
( sleep 1; open "http://127.0.0.1:8787" ) &
python3 server.py
