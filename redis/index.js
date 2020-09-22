const redis = require("redis");
const logger = require("../logger")(module);
const config = require("../config");
const redisPrefix = config.redisPrefix || "";
const EventEmitter = require("events");

const lock = redis.createClient();
const gettorSettor = redis.createClient();
const subscriber = redis.createClient();
const publisher = redis.createClient();

lock.on("error", function (err) {
  logger.error(err);
});

gettorSettor.on("error", function (err) {
  logger.error(err);
});

subscriber.on("error", function (err) {
  logger.error(err);
});

publisher.on("error", function (err) {
  logger.error(err);
});

class NRP extends EventEmitter {
  constructor(lock, gettorSettor, subscriber, publisher) {
    super();
    this._locker = lock;
    this._subscriber = subscriber;
    this._publisher = publisher;
    this._gettorSettor = gettorSettor;
    this._subscriptions = new Map();
    this._prefn = new Map();
    this._redis_locker = require("redis-lock")(this._locker);
    this.lock = (event) => {
      return new Promise((resolve) => {
        this._redis_locker(`${redisPrefix}${event}`, (unlock) =>
          resolve(unlock)
        );
      });
    };
    this.delete = (key) => {
      key = `${redisPrefix}${key}`;
      return new Promise((resolve, reject) => {
        logger.debug(`Deleting Redis key "${key}"`);
        this._gettorSettor.del(key, (err, value) => {
          if (err) return reject(err);
          resolve(value);
        });
      });
    };
    this.get = (key) => {
      key = `${redisPrefix}${key}`;
      return new Promise((resolve, reject) => {
        logger.debug(`Getting Redis key "${key}"`);
        this._gettorSettor.get(key, (err, value) => {
          if (err) return reject(err);
          resolve(value);
        });
      });
    };
    this.expire = (key, seconds) => {
      key = `${redisPrefix}${key}`;
      return new Promise((resolve, reject) => {
        logger.debug(`Expiring Redis key "${key}"`);
        this._gettorSettor.expire(key, seconds, (err, value) => {
          if (err) return reject(err);
          resolve(value);
        });
      });
    };
    this.set = (key, value, expiry) => {
      key = `${redisPrefix}${key}`;
      return new Promise((resolve, reject) => {
        logger.debug(`Setting Redis key "${key}" to "${value}"`);
        this._gettorSettor.set(key, value, (err) => {
          if (err) return reject(err);
          if (expiry) {
            this.expire(key.replace(redisPrefix, ""), expiry).then(() => {
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
    };
    this.keys = (pattern) => {
      pattern = `${redisPrefix}${pattern}`;
      return new Promise((resolve, reject) => {
        logger.debug(`Getting Redis key "${key}"`);
        this._gettorSettor.keys(pattern, (err, keys) => {
          if (err) return reject(err);
          resolve(keys);
        });
      });
    };
    this._subscriber.on("message", async (channel, message) => {
      message = JSON.parse(message);
      channel = channel.replace(redisPrefix, "");
      logger.debug(
        `Recieved redis event channel: "${channel}" message: "${message}" `
      );
      if (this._prefn.has(channel)) {
        let fns = this._prefn.get(channel);
        for (var i = 0; i < fns.length; i++) {
          await fns[i](message);
        }
      }
      super.emit(channel, message);
    });
  }
  _registerRedisListener(channel, callback) {
    if (this._subscriptions.get(channel)) {
      callback();
      return;
    }
    this._subscriptions.set(channel, true);
    this._subscriber.subscribe(`${redisPrefix}${channel}`, callback);
  }
  _unregisterRedisListener(channel, callback) {
    let preFns = this._prefn.get(channel);
    if (
      !this._subscriptions.get(channel) ||
      this.listenerCount(channel) !== 0
    ) {
      callback();
      return;
    }
    if (this.listenerCount(channel) === 0 && (!preFns || preFns.length == 0)) {
      this._subscriptions.delete(channel);
      this._subscriber.unsubscribe(`${redisPrefix}${channel}`, callback);
    } else {
      callback();
    }
  }
  on(channel, fn, callback, prefn) {
    if (prefn) {
      if (!this._prefn.has(channel)) this._prefn.set(channel, []);
      this._prefn.get(channel).push(fn);
    } else {
      super.on(channel, fn);
    }
    this._registerRedisListener(channel, () => callback(channel));
  }
  off(channel, fn, callback, prefn) {
    if (prefn) {
      if (!this._prefn.has(channel)) {
        logger.debug(`no prefns for channel "${channel}"`);
        return;
      }
      let fns = this._prefn.get(channel);
      let index = fns.indexOf(fn);
      fns.splice(index, 1);
    } else {
      super.off(channel, fn);
    }
    this._unregisterRedisListener(channel, () => callback(channel));
  }
  emit(channel, data, callback) {
    this._publisher.publish(`${redisPrefix}${channel}`, JSON.stringify(data));
    logger.debug(`Sent event "${redisPrefix}${channel}"`);
    if (callback) callback(channel);
  }
}

module.exports = {
  nrp: new NRP(lock, gettorSettor, subscriber, publisher),
  ...require("./node"),
};
