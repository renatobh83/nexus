import { FastifyInstance } from "fastify";
import { userRoutes } from "./users.routes";

async function routes(fastify: FastifyInstance) {
  await fastify.register(userRoutes, { prefix: "/api/v1" });
}

export default routes;
