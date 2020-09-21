module.exports = require(`./config.${
  require("../env").development ? "dev" : "prod"
}.json`);
