# Use an official Python runtime as a parent image
FROM python:3.14-slim

# Set the working directory in the container
WORKDIR /app

# Copy dependency file and install packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code to the working directory
COPY . .

# Make the entrypoint script executable
RUN chmod +x /app/entrypoint.sh

# Create a non-root user, change ownership of the app directory, and switch to the user
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

# Set the entrypoint script to be executed when the container starts
ENTRYPOINT ["/app/entrypoint.sh"]
