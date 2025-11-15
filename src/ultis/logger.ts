import winston from "winston";

const jsonLogFileFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.timestamp(),
  winston.format.prettyPrint()
);

let env = "prod";
if (process.env?.NODE_ENV) {
  env = process.env.NODE_ENV;
}

const level = env !== "development" ? "info" : "debug";

// Create file loggers
const logger = winston.createLogger({
  level,
  format: jsonLogFileFormat,
  // expressFormat: true,

  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        // eslint-disable-next-line no-shadow
        winston.format.printf(({ level, message, timestamp, stack }) => {
          if (stack) {
            // print log trace
            return `${level}: ${timestamp} ${message} - ${stack}`;
          }
          return `${level}: ${timestamp} ${message}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: "./logs/app.logg",
      level: "error",
      handleExceptions: true,
      maxsize: 10485760,
      maxFiles: 10,
    }),
    new winston.transports.Http({
      level: "warn",
      format: winston.format.json(),
    }),
  ],
});

export { logger };

export function error(arg0: string, error: any): any {
  throw new Error("Function not implemented.");
}
