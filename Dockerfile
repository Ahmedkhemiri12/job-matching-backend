# Use the official Node.js 20 image, as specified in your package.json
FROM node:20-slim

# Create and set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of your application's code from the build context (your 'server' folder)
COPY . .

# Expose the port your app runs on
EXPOSE 5000

# The command to run migrations, seeds, and then start the application
CMD ["sh", "-c", "npx knex migrate:latest --knexfile ./knexfile.cjs && npx knex seed:run --knexfile ./knexfile.cjs && node ./server.js"]