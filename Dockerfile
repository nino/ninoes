FROM node:22-alpine AS development-dependencies-env
COPY package.json package-lock.json /app/
WORKDIR /app
RUN npm install

FROM node:22-alpine AS build-env
# Define build arguments
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
# Set them as environment variables
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
# Define build arguments again for the final stage
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
# Set them as environment variables
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
COPY ./package.json package-lock.json /app/
COPY --from=build-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
WORKDIR /app
CMD ["npm", "start"]
