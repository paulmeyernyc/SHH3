FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy service files
COPY ./microservices/common ./microservices/common
COPY ./microservices/audit-service ./microservices/audit-service
COPY ./shared ./shared

# Set environment variables
ENV NODE_ENV production
ENV AUDIT_SERVICE_PORT 3011

# Expose the service port
EXPOSE 3011

# Start the service
CMD ["node", "microservices/audit-service/src/index.js"]