import fastify from "fastify";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import { queues } from "../../lib/Queue";

export async function registerBullMQ(app: ReturnType<typeof fastify>) {
  //   processQueues();
  const serverAdapter = new FastifyAdapter();
  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q.bull)),
    serverAdapter,
  });
  serverAdapter.setBasePath("/ui");
  app.register(serverAdapter.registerPlugin(), { prefix: "/ui" });

  //   setImmediate(() => {
  //     upsertJobScheduler("VerifyTicketsChatBotInactives", { every: 10_60_000 });
  //     upsertJobScheduler("VerifyTicketsConfirmacaoInactives", {
  //       pattern: "0 17 * * *",
  //       tz: "America/Sao_Paulo",
  //     });
  //   });
}
