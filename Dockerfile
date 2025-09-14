# ---------- Build Stage ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --frozen-lockfile

# Copy source
COPY . .

# Build Next.js (no secrets yet, only needs NEXT_PUBLIC_* if absolutely required)
RUN npm run build

# ---------- Runtime Stage ----------
FROM node:18-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy only needed files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080
CMD ["npm", "start"]
