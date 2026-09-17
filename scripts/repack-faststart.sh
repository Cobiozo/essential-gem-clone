#!/usr/bin/env bash
# Przepakowanie istniejących filmów do faststart (moov na początku pliku).
# Uruchamiać NA SERWERZE PLIKÓW (Cyberfolks), w katalogu z nagraniami.
#
#   bash scripts/repack-faststart.sh /home/.../uploads/training-media          # tryb raportu
#   bash scripts/repack-faststart.sh /home/.../uploads/training-media --apply  # przepakowanie
#
# Bez re-enkodowania (-c copy) — jakość i rozmiar pozostają bez zmian.
set -euo pipefail

DIR="${1:?Podaj katalog z plikami wideo}"
APPLY="${2:-}"

command -v ffmpeg >/dev/null || { echo "Brak ffmpeg na serwerze"; exit 1; }
command -v ffprobe >/dev/null || { echo "Brak ffprobe na serwerze"; exit 1; }

needs_faststart() {
  # moov po mdat => brak faststart
  local order
  order="$(ffprobe -v error -show_entries "format=format_name" -of csv=p=0 "$1" >/dev/null 2>&1 && \
    python3 - "$1" <<'PY'
import struct, sys
p = sys.argv[1]
with open(p, 'rb') as f:
    off = 0
    import os
    total = os.path.getsize(p)
    for _ in range(64):
        f.seek(off)
        h = f.read(16)
        if len(h) < 8:
            break
        size = struct.unpack('>I', h[:4])[0]
        t = h[4:8].decode('latin1', 'replace')
        if size == 1:
            size = struct.unpack('>Q', h[8:16])[0]
        elif size == 0:
            size = total - off
        if t == 'moov':
            print('ok'); break
        if t == 'mdat':
            print('needs'); break
        if size < 8:
            break
        off += size
    else:
        print('needs')
PY
  )"
  [ "$order" = "needs" ]
}

count=0
fixed=0
while IFS= read -r -d '' f; do
  if needs_faststart "$f"; then
    count=$((count + 1))
    echo "BRAK FASTSTART: $f"
    if [ "$APPLY" = "--apply" ]; then
      tmp="${f%.*}.faststart.mp4"
      if ffmpeg -y -hide_banner -loglevel error -i "$f" -c copy -movflags +faststart "$tmp"; then
        mv -f "$tmp" "$f"
        fixed=$((fixed + 1))
        echo "  -> przepakowano"
      else
        rm -f "$tmp"
        echo "  -> BŁĄD, plik pozostawiony bez zmian"
      fi
    fi
  fi
done < <(find "$DIR" -maxdepth 1 -type f \( -iname '*.mp4' -o -iname '*.m4v' -o -iname '*.mov' \) -print0)

echo "Pliki bez faststart: $count, przepakowane: $fixed"
