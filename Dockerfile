FROM node:22-alpine

WORKDIR /app

# Copy manifest files first
COPY package.json yarn.lock ./

RUN yarn install

# Copy the rest of the app
COPY . .

# Default command – uses "start": "ts-node index.ts"
CMD ["yarn", "start"]