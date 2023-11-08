FROM node:alpine3.16
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN mkdir /app
WORKDIR /app
# COPY node_modules/ ./
COPY package.json tsconfig.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts
COPY ./src ./src

# dev with nodemon
# RUN npm install nodemon && npm install

# CMD npm run start
CMD pnpm run dev