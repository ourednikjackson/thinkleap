## frontend/Dockerfile

FROM node:18-alpine

WORKDIR /app

# Copy package.json first
COPY package.json ./

# Install dependencies and generate package-lock.json
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port
EXPOSE 3000

# Start development server with hot reloading
CMD ["npm", "run", "dev"]