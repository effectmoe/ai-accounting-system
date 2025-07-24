FROM node:18-alpine

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN npm install --production

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]