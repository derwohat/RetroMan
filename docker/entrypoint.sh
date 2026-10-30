#!/bin/sh
set -e

UPLOAD_DIR=/app/uploads
APP_UID=1001
APP_GID=1001

# A bind mount replaces whatever the image prepared at UPLOAD_DIR, so the
# directory can arrive owned by a host user and be unwritable for the service.
# Uploads then fail with EACCES while everything else looks healthy. Correcting
# that needs root, which is why this starts as root and drops privileges right
# after. setpriv execs instead of forking, so the server still becomes PID 1 and
# docker stop reaches it directly.
as_app() {
  setpriv --reuid="$APP_UID" --regid="$APP_GID" --clear-groups "$@"
}

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$UPLOAD_DIR"
  if ! as_app test -w "$UPLOAD_DIR"; then
    chown -R "$APP_UID:$APP_GID" "$UPLOAD_DIR" 2>/dev/null || true
  fi
  if ! as_app test -w "$UPLOAD_DIR"; then
    owner="$(stat -c '%u:%g' "$UPLOAD_DIR" 2>/dev/null || echo unbekannt)"
    mode="$(stat -c '%a' "$UPLOAD_DIR" 2>/dev/null || echo unbekannt)"
    echo "RetroMan — FEHLER: $UPLOAD_DIR ist für den Dienst nicht beschreibbar." >&2
    echo "  Eigentümer: $owner, Modus: $mode, der Dienst läuft als $APP_UID:$APP_GID." >&2
    echo "  Das Verzeichnis liegt auf dem Wirtssystem; von hier aus geht es nicht." >&2
    # Naming the wrong remedy costs more time than naming none: when the owner
    # already matches, a chown changes nothing and sends the reader looking in
    # the wrong place.
    if [ "$owner" = "$APP_UID:$APP_GID" ]; then
      echo "  Der Eigentümer stimmt bereits — es fehlt das Schreibrecht, oder das" >&2
      echo "  Dateisystem ist schreibgeschützt eingehängt. Auf dem Wirtssystem:" >&2
      echo "    chmod u+rwx <Verzeichnis>" >&2
    else
      echo "  Der Start hat versucht, den Eigentümer zu setzen, und durfte nicht." >&2
      echo "  Auf dem Wirtssystem ausführen:" >&2
      echo "    chown -R $APP_UID:$APP_GID <Verzeichnis>" >&2
    fi
    echo "  Den Pfad nennt dieser Befehl:" >&2
    echo "    docker inspect -f '{{range .Mounts}}{{if eq .Destination \"$UPLOAD_DIR\"}}{{.Source}}{{end}}{{end}}' <Container>" >&2
    exit 1
  fi
  exec setpriv --reuid="$APP_UID" --regid="$APP_GID" --clear-groups "$0" "$@"
fi

echo "RetroMan — running database migrations..."
cd /migrate && node node_modules/prisma/build/index.js migrate deploy --schema=schema.prisma

echo "RetroMan — seeding database..."
node /app/prisma/seed.mjs

echo "RetroMan — starting server..."
exec node /app/server.js
