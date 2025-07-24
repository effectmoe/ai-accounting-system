FROM node:20-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install all dependencies (needed for build)
RUN npm ci || npm install

# Copy application files
COPY . .

# Build the Mastra application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]