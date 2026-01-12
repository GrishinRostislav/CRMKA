FROM node:20-slim

WORKDIR /app

# Install build dependencies just in case (for sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# Install dependencies first (to cache them)
RUN npm install

COPY . .

# FORCE REBUILD: Remove any Windows binaries that might have been copied
# and rebuild sqlite3 for Linux
RUN rm -rf node_modules/better-sqlite3/build
RUN npm rebuild better-sqlite3

# Create a volume mount point for the database
VOLUME /app/data

# Environment variable where DB should be located
ENV DB_PATH=/app/data/crmka.db

EXPOSE 3001

CMD ["npm", "start"]
