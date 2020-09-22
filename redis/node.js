const nrp = require("./index");
const process = require("process");
const schedule = require("node-schedule");
const nodeID = ((length) => {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    //TODO urandom
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
})(10);
const logger = require("../logger")(module);

nrp.on(
  `node:${nodeID}:request`,
  (data) => {
    data = JSON.parse(data);
    if (data.message === "PING")
      nrp.emit(
        `node:${nodeID}:callback`,
        JSON.stringify({
          message: "PONG",
        })
      );
  },
  (event) => {
    logger.info(`Listening to event "${event}"`);
  }
);

async function getActiveNodes() {
  let activeNodes = await nrp.get("active-nodes");
  if (!activeNodes) return {};
  return JSON.parse(activeNodes);
}

module.exports = {
  nodeID,
  async activateNode() {
    let unlock = await nrp.lock("active-nodes");
    try {
      let activeNodes = await getActiveNodes();
      activeNodes[nodeID] = true;
      await nrp.set("active-nodes", JSON.stringify(activeNodes));
    } finally {
      unlock();
    }
    let scheduleFunction = (date) => {
      schedule.scheduleJob(date, async () => {
        let nodeList = await getActiveNodes();
        if (!nodeList[nodeID]) {
          logger.error("Rogue node deteceted stopping...");
          process.exit();
        }
        scheduleFunction(new Date(Date.now() + 330));
      });
    };
    scheduleFunction(new Date(Date.now() + 330));
  },
  async deactivateNode() {
    await new Promise((resolve) => {
      nrp.emit(
        `deactivate-node`,
        JSON.stringify({
          id: nodeID,
        }),
        (event) => {
          logger.debug(`Emitted event "${event}"`);
          logger.info(`Stopped redis node with id "${nodeID}"`);
          resolve();
        }
      );
    });
  },
  getActiveNodes,
};
