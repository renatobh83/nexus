import "dotenv/config";
import { start } from "./api";
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
console.log("ENTROU AQUI")
if (require.main === module) {
  console.log("ENTROU AQUI")
  start().catch((err) => {
  console.error("❌ Erro fatal ao iniciar o servidor:", err);
  process.exit(1);
});

}
