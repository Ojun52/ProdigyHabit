# === 1. Base Stage: Common dependencies ===
FROM node:18-alpine AS base
WORKDIR /app
# Copy package files to leverage Docker cache
COPY package*.json ./

# === 2. Dev Stage: For local development ===
FROM base AS dev
# Install all dependencies, including devDependencies
RUN npm install
# Set the default command for development
CMD ["npm", "run", "dev"]

# === 3. Builder Stage: For creating the production build ===
FROM base AS builder
# Install all dependencies needed for the build
RUN npm install
# Copy all source files
COPY . .
# Run the build script
RUN npm run build

# === 4. Prod Stage: For running in production ===
FROM node:18-alpine AS prod
WORKDIR /app
# Copy only the necessary artifacts from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# Expose the port and set the start command
EXPOSE 3000
CMD ["npm", "start"]
