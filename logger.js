const path = require("path");
const colors = require("colors/safe");
const { createLogger, format, transports } = require("winston");
const { ConsoleFormat } = require("winston-console-format");

class CustomConsoleFormat extends ConsoleFormat {
  constructor(opts) {
    super(opts);
    this.callingModule = path.basename(opts.callingModule.filename);
  }
  message(info, chr, color) {
    const message = info.message.replace(
      ConsoleFormat.reSpacesOrEmpty,
      `$1${color}${colors.dim(chr)}${colors.reset(" ")}`
    );
    return `${color}${info.timestamp} [${this.callingModule}] ${info.level}:${message}`;
  }
}

module.exports = function (callingModule) {
  return new createLogger({
    level: process.env.NODE_ENV == "development" ? "silly" : "info",
    format: format.combine(
      format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss",
      }),
      format.ms(),
      format.errors({
        stack: true,
      }),
      format.splat(),
      format.json()
    ),
    defaultMeta: {
      service: "Test",
    },
    transports: [
      new transports.Console({
        format: format.combine(
          format.colorize({
            all: true,
          }),
          format.padLevels(),
          new CustomConsoleFormat({
            showMeta: true,
            metaStrip: ["timestamp", "service"],
            inspectOptions: {
              depth: Infinity,
              colors: true,
              maxArrayLength: Infinity,
              breakLength: 120,
              compact: Infinity,
            },
            callingModule: callingModule,
          })
        ),
      }),
    ],
  });
};
