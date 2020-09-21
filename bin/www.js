#!/usr/bin/env node

require("@babel/register");
const logger = require("../logger")(module);
const app = require("../app");

process.stdin.resume();

async function toKill() {
  logger.warn("Stopping");
  const stopTime = Date.now();
  await app.stop(stopTime);
  logger.warn(`Stopped in ${Date.now() - stopTime}ms`);
  process.exit();
}

process.on("SIGINT", async function () {
  await toKill();
});

process.on("SIGTERM", async function () {
  await toKill();
});

process.on("SIGHUP", async function () {
  await toKill();
});

process.on("unhandledRejection", (reason, p) => {
  console.log("Unhandled Rejection at: Promise", p, "reason:", reason);
});

const startTime = Date.now();
app.start(startTime).then(() => {
  logger.info(`Started in ${Date.now() - startTime}ms`);
});
