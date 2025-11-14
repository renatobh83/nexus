import { FastifyInstance } from "fastify";
import { userRoutes } from "./users.routes";
import { wppRoutes } from "./wpp.routes";

async function routes(fastify: FastifyInstance) {
  await fastify.register(userRoutes, { prefix: "/api/v1" });
  await fastify.register(wppRoutes, { prefix: "/api/v1" });
}

export default routes;
