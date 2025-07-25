FROM node:20-alpine

WORKDIR /app

# Copy only the server file
COPY server.mjs ./

# Expose port
EXPOSE 4111

# Start the server directly
CMD ["node", "server.mjs"]