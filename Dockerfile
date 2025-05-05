FROM oven/bun:latest

WORKDIR /app

COPY *.json ./
COPY bun.lockb ./

RUN bun install
RUN mkdir /app/data

COPY ./api/* ./api/
COPY ./lib/* ./lib/
COPY ./repository/* ./repository/
COPY *.ts ./

ENV NODE_ENV=production
ENV PORT=8888

ENV ORIGIN='http://localhost/'
ENV SQLITE_PATH='./data/data.sqlite'
ENV PORT=8888

ENV ANILIBRIA_API='api.anilibria.tv'
ENV ANILIBRIA_DL='static-libria.weekstorm.us'
ENV ANILIBRIA_STATIC='static-libria.weekstorm.one'

CMD ["bun", "run", "index.ts"]