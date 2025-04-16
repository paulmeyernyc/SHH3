FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy gateway service files
COPY ./microservices/gateway ./microservices/gateway

# Set environment variables
ENV NODE_ENV production
ENV PORT 3000

# Expose the gateway port
EXPOSE 3000

# Start the gateway
CMD ["node", "microservices/gateway/src/index.js"]