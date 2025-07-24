FROM node:18-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install production dependencies
RUN npm ci --production || npm install --production

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]