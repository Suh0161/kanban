#!/bin/sh
set -e

# Railway/Fly volumes mount as root. The runtime user is `app`, so fix
# ownership before opening SQLite or writing uploads under /data.
if [ -d /data ]; then
  chown -R app:app /data
  mkdir -p /data/uploads
  chown -R app:app /data/uploads
fi

cd /app/backend
exec su-exec app:app node src/server.js
