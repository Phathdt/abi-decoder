# Multi-stage build for production
FROM node:24-alpine AS base

# Install security updates and pnpm
RUN apk update && apk upgrade && \
  npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build stage
FROM base AS builder

# Build the application
RUN pnpm run build

# Production stage
FROM nginx:1.29-alpine AS production

# Install security updates
RUN apk update && apk upgrade

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
