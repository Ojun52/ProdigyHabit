# Use an official Python runtime as a parent image
FROM python:3.14-slim

# Set the working directory in the container
WORKDIR /app

# Copy the dependencies file to the working directory
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code to the working directory
COPY . .

# The PORT environment variable is expected to be set by the runtime environment (e.g., docker-compose)
# EXPOSE will be handled by docker-compose, but it's good practice to document it
# EXPOSE ${PORT}

# Run app.py using Gunicorn when the container launches (using shell form to allow variable substitution)
CMD gunicorn --workers 4 --bind 0.0.0.0:$PORT app:app
