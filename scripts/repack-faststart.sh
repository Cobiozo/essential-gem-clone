#!/usr/bin/env bash
# R2.5-C — bezpieczne przepakowanie filmow do faststart (moov na poczatku pliku).
# Dziala WYLACZNIE na plikach z manifestu (scripts/faststart-manifest.txt).
# Bez re-enkodowania: ffmpeg -c copy -movflags +faststart (jakosc bez zmian).
#
# Uruchamiac NA SERWERZE PLIKOW (Cyberfolks):
#   bash repack-faststart.sh /home/.../uploads/training-media faststart-manifest.txt            # DRY-RUN (domyslny)
#   bash repack-faststart.sh /home/.../uploads/training-media faststart-manifest.txt --apply    # wykonanie
#
# Bezpieczenstwo:
#   - nie skanuje katalogu, przetwarza tylko nazwy z manifestu,
#   - pomija pliki ktore juz maja faststart (mozna uruchamiac wielokrotnie),
#   - wynik zapisuje do pliku tymczasowego .repack.tmp.mp4,
#   - weryfikuje wynik przez ffprobe (mp4 + h264 + aac + yuv420p + faststart) PRZED podmiana,
#   - oryginal kopiuje do podkatalogu _faststart_backup/ i podmienia atomowo (mv w tym samym FS),
#   - loguje kazdy plik do repack-faststart.log (OK/SKIP/FAIL) — log sluzy tez do wznowienia.
set -euo pipefail

DIR="${1:?Podaj katalog z plikami wideo}"
MANIFEST="${2:?Podaj plik manifestu z nazwami plikow}"
APPLY="${3:-}"

command -v ffmpeg  >/dev/null || { echo "Brak ffmpeg na serwerze";  exit 1; }
command -v ffprobe >/dev/null || { echo "Brak ffprobe na serwerze"; exit 1; }
command -v python3 >/dev/null || { echo "Brak python3 na serwerze"; exit 1; }

[ -d "$DIR" ] || { echo "Brak katalogu: $DIR"; exit 1; }
[ -f "$MANIFEST" ] || { echo "Brak manifestu: $MANIFEST"; exit 1; }

BACKUP_DIR="$DIR/_faststart_backup"
LOG="$DIR/repack-faststart.log"

has_faststart() {
  python3 - "$1" <<'PY'
import os, struct, sys
p = sys.argv[1]
total = os.path.getsize(p)
res = 'needs'
with open(p, 'rb') as f:
    off = 0
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
            res = 'ok'; break
        if t == 'mdat':
            res = 'needs'; break
        if size < 8:
            break
        off += size
print(res)
PY
}

probe() { # probe <plik> -> "container|vcodec|acodec|pixfmt"
  local fmt v a pix
  fmt="$(ffprobe -v error -show_entries format=format_name -of csv=p=0 "$1" || echo '')"
  v="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$1" || echo '')"
  a="$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "$1" || echo '')"
  pix="$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "$1" || echo '')"
  echo "${fmt}|${v}|${a}|${pix}"
}

is_standard() { # "container|vcodec|acodec|pixfmt"
  case "$1" in
    *mp4*\|h264\|aac\|yuv420p) return 0 ;;
    *) return 1 ;;
  esac
}

total=0; todo=0; skipped=0; fixed=0; failed=0; notstd=0; missing=0; bytes=0
DRY=1; [ "$APPLY" = "--apply" ] && DRY=0
[ "$DRY" = "1" ] && echo "=== TRYB DRY-RUN — zadnych zmian na dysku ===" || echo "=== TRYB APPLY ==="

if [ "$DRY" = "0" ]; then
  mkdir -p "$BACKUP_DIR"
  touch "$LOG"
fi

ROWS="$(mktemp)"
trap 'rm -f "$ROWS"' EXIT

row() { # row <plik> <rozmiar> <h264> <aac> <yuv420p> <faststart> <operacja> <status>
  printf '| %s | %s | %s | %s | %s | %s | %s | %s |\n' "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8" >> "$ROWS"
}

human() { [ -z "${1:-}" ] && { echo "-"; return; }; echo "$(( $1 / 1048576 )) MB"; }

while IFS= read -r name; do
  [ -z "$name" ] && continue
  case "$name" in \#*) continue ;; esac
  total=$((total + 1))

  # Twarda walidacja nazwy: tylko plik z manifestu, zadnych sciezek ani wyjscia poza katalog.
  case "$name" in
    */*|*'..'*)
      echo "ODRZUCONO  $name (nazwa zawiera sciezke — dozwolone tylko nazwy plikow z manifestu)"
      row "$name" "-" "-" "-" "-" "-" "brak" "ODRZUCONY (niedozwolona nazwa)"
      failed=$((failed + 1)); continue ;;
  esac

  f="$DIR/$name"

  if [ ! -f "$f" ]; then
    echo "MISSING  $name"
    row "$name" "-" "-" "-" "-" "-" "brak" "BRAK PLIKU NA DYSKU"
    missing=$((missing + 1)); continue
  fi

  size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f")

  if [ "$(has_faststart "$f")" = "ok" ]; then
    echo "SKIP     $name (ma juz faststart)"
    row "$name" "$(human "$size")" "-" "-" "-" "TAK" "brak" "POMINIETY (juz faststart)"
    skipped=$((skipped + 1)); continue
  fi

  info="$(probe "$f")"
  icont="${info%%|*}"; rest="${info#*|}"
  iv="${rest%%|*}"; rest="${rest#*|}"
  ia="${rest%%|*}"; ipix="${rest##*|}"
  [ "$iv" = "h264" ] && ch264="TAK" || ch264="NIE ($iv)"
  [ "$ia" = "aac" ] && caac="TAK" || caac="NIE ($ia)"
  [ "$ipix" = "yuv420p" ] && cpix="TAK" || cpix="NIE ($ipix)"

  if ! is_standard "$info"; then
    echo "NIE-STD  $name ($info) — wymaga decyzji / re-enkodowania, pomijam"
    row "$name" "$(human "$size")" "$ch264" "$caac" "$cpix" "NIE" "re-enkodowanie (decyzja reczna)" "POMINIETY (niezgodny ze standardem)"
    notstd=$((notstd + 1)); continue
  fi

  todo=$((todo + 1)); bytes=$((bytes + size))

  if [ "$DRY" = "1" ]; then
    echo "PLAN     $name ($info, $((size / 1048576)) MB) -> ffmpeg -c copy -movflags +faststart"
    row "$name" "$(human "$size")" "$ch264" "$caac" "$cpix" "NIE" "-c copy -movflags +faststart" "DO PRZEPAKOWANIA"
    continue
  fi


  tmp="$f.repack.tmp.mp4"
  rm -f "$tmp"
  if ! ffmpeg -y -hide_banner -loglevel error -i "$f" -c copy -movflags +faststart "$tmp"; then
    rm -f "$tmp"; echo "FAIL     $name (ffmpeg)" | tee -a "$LOG"
    row "$name" "$(human "$size")" "$ch264" "$caac" "$cpix" "NIE" "-c copy -movflags +faststart" "BLAD: ffmpeg"
    failed=$((failed + 1)); continue
  fi
  out="$(probe "$tmp")"
  if ! is_standard "$out" || [ "$(has_faststart "$tmp")" != "ok" ]; then
    rm -f "$tmp"; echo "FAIL     $name (weryfikacja: $out)" | tee -a "$LOG"
    row "$name" "$(human "$size")" "$ch264" "$caac" "$cpix" "NIE" "-c copy -movflags +faststart" "BLAD: weryfikacja wyniku ($out)"
    failed=$((failed + 1)); continue
  fi
  osize=$(stat -c%s "$tmp" 2>/dev/null || stat -f%z "$tmp")
  if [ "$osize" -lt $((size / 2)) ]; then
    rm -f "$tmp"; echo "FAIL     $name (podejrzany rozmiar wyniku: $osize < $size)" | tee -a "$LOG"
    row "$name" "$(human "$size")" "$ch264" "$caac" "$cpix" "NIE" "-c copy -movflags +faststart" "BLAD: podejrzany rozmiar wyniku"
    failed=$((failed + 1)); continue
  fi

  cp -p "$f" "$BACKUP_DIR/$name"
  mv -f "$tmp" "$f"          # atomowy rename w obrebie tego samego systemu plikow
  echo "OK       $name ($out, faststart)" | tee -a "$LOG"
  row "$name" "$(human "$size")" "$ch264" "$caac" "$cpix" "TAK (po operacji)" "-c copy -movflags +faststart" "OK"
  fixed=$((fixed + 1))
done < "$MANIFEST"

echo
echo "| Plik | Rozmiar | H.264 | AAC | yuv420p | Faststart | Operacja | Status |"
echo "|---|---:|---|---|---|---|---|---|"
cat "$ROWS"
echo

FREE_KB="$(df -Pk "$DIR" | awk 'NR==2 {print $4}')"
NEED_MB=$(( bytes / 1048576 + bytes / 10485760 ))
FREE_MB=$(( FREE_KB / 1024 ))

echo "----"
echo "Z manifestu: $total | brak na dysku: $missing | juz faststart: $skipped | niestandardowe: $notstd"
echo "Wolne miejsce w $DIR: ${FREE_MB} MB | wymagane: ~${NEED_MB} MB (kopie zapasowe + plik tymczasowy)"
if [ "$NEED_MB" -gt "$FREE_MB" ]; then
  echo "UWAGA: za malo wolnego miejsca — uruchom operacje partiami (podziel manifest)."
fi
if [ "$DRY" = "1" ]; then
  echo "Do przepakowania: $todo, laczny rozmiar: $((bytes / 1048576)) MB"
  echo "Przewidywany wynik: kazdy plik MP4/h264/aac/yuv420p z moov na poczatku, rozmiar praktycznie bez zmian."
  echo "Uruchom ponownie z --apply aby wykonac."
else
  echo "Przepakowane: $fixed | bledy: $failed | kopie: $BACKUP_DIR | log: $LOG"
fi

