# === Stage 1: Build ===
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the Next.js application for production
RUN npm run build

# === Stage 2: Production ===
FROM node:20-alpine

WORKDIR /app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production-necessary files from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Change ownership of the app directory
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 3000

# The command to start the production server
CMD ["npm", "start"]