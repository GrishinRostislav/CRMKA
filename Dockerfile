# Stage 1: Build the React application
FROM node:18-slim as build
WORKDIR /app
COPY package*.json ./
RUN npm install
# Fix permissions for binaries
RUN chmod -R +x node_modules/.bin

# Copy source code
COPY . .

# Set API URL to relative path (Nginx will handle proxying)
ENV VITE_API_URL=/api

# Build
RUN npm run build

# Stage 2: Serve with Caddy (Automatic HTTPS)
FROM caddy:2-alpine

# Copy built files to Caddy's web root
COPY --from=build /app/dist /srv

# Copy Caddy config
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
EXPOSE 443
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
