#!/usr/bin/env bash
# Génère les versions « ti done » (48 kbit/s mono) des MP3 de Radio BREK manquantes.
cd "$(dirname "$0")/../radio" || exit 1
for f in *.mp3; do
  o="lo/$f"
  if [ ! -f "$o" ] || [ "$f" -nt "$o" ]; then
    ffmpeg -nostdin -v error -y -i "$f" -ac 1 -ar 32000 -b:a 48k -map_metadata -1 "$o" && echo "lo: $f"
  fi
done
