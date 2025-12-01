#!/bin/sh

# This script is used as the entrypoint for the Docker container.
# It waits for the database to be ready, then initializes the database
# if needed, and finally starts the Gunicorn server.

# The Flask app will try to connect to the DB. The init-db command has a retry mechanism.
# In a more robust production setup, you might use a tool like wait-for-it.sh
# to explicitly check if the DB port is open before proceeding.
echo "Initializing database..."
flask init-db

# Start Gunicorn server
# Using exec means Gunicorn will replace the shell process and become the
# main process (PID 1), which is important for signal handling.
echo "Starting Gunicorn..."
exec gunicorn --workers 4 --bind 0.0.0.0:$PORT --reload app:app
