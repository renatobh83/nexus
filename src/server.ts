import "dotenv/config";
import { start } from "./api";
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
if (require.main === module) {
  start();
  process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});
}
