# Pro-OFAIR PWA Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build the React application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Set environment variables for build
ENV VITE_API_BASE_URL=http://localhost
ENV VITE_AUTH_SERVICE_PORT=8001
ENV VITE_USERS_SERVICE_PORT=8002
ENV VITE_LEADS_SERVICE_PORT=8003
ENV VITE_PROPOSALS_SERVICE_PORT=8004
ENV VITE_REFERRALS_SERVICE_PORT=8005
ENV VITE_PAYMENTS_SERVICE_PORT=8006
ENV VITE_NOTIFICATIONS_SERVICE_PORT=8007
ENV VITE_ADMIN_SERVICE_PORT=8008
ENV VITE_NODE_ENV=production
ENV VITE_API_TIMEOUT=10000

# Build the application
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 3000
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]