FROM node:18-slim

WORKDIR /app

# Install build dependencies just in case (for sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Create a volume mount point for the database
VOLUME /app/data

# Environment variable where DB should be located
ENV DB_PATH=/app/data/crmka.db

EXPOSE 3001

CMD ["npm", "start"]
