#!/bin/bash
# Check if EmailEngine is responding on port 3000
# If not, restart the container

if ! curl -sf --connect-timeout 5 http://localhost:3000/ > /dev/null 2>&1; then
  echo "$(date) - EmailEngine not responding, restarting container..." >> /var/log/emailengine-check.log
  docker restart emailengine-app >> /var/log/emailengine-check.log 2>&1
else
  echo "$(date) - EmailEngine OK" >> /var/log/emailengine-check.log
fi
