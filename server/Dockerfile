FROM node:18-alpine

WORKDIR /app

# Install build dependencies for sqlite3 (python, make, g++)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

# Create a volume mount point for the database
VOLUME /app/data

# Environment variable where DB should be located
ENV DB_PATH=/app/data/crmka.db

EXPOSE 3001

CMD ["npm", "start"]
