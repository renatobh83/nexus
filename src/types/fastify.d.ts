import { Server } from "socket.io";
import { Redis } from "ioredis";
declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
    io: Server;
    redis: Redis;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string; email: string };
    moduleName: any;
  }
}
