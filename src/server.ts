import "dotenv/config";
import { start } from "./api";
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
if (require.main === module) {
  start();
}
