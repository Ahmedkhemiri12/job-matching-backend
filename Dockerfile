# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Install poppler-utils (which provides the pdftotext tool)
RUN apt-get update && apt-get install -y poppler-utils

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
# We do this in a separate step to leverage Docker's caching mechanism
COPY package.json ./
COPY server/package.json ./server/
RUN npm install --prefix server

# Copy the rest of your application's code
COPY . .

# Make port 10000 available to the world outside this container
EXPOSE 10000

# Define the command to run your app
CMD [ "node", "server/server.js" ]