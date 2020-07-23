FROM node:12-alpine
LABEL maintainer="chloejiwon"

RUN mkdir -p /home/node/CheatingBusters/signaling-server && \
    chown -R node:node /home/node/CheatingBusters

WORKDIR /home/node/CheatingBusters/signaling-server
USER node
COPY --chown=node:node . .

RUN npm install

EXPOSE 8800
ENTRYPOINT node server.js
