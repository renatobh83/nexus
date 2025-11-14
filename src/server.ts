import "dotenv/config";
import { start } from "./api";

if (require.main === module) {
  start();
}
