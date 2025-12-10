import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fs from "fs";
import { handleServerError } from "../../errors/errors.helper";
import path from "path";
import { RelatorioData } from "./statistics.types";
import { formatador, generatePDF } from "./statistics.utils";

type IndexQuery = {
  dateStart: string;
  dateEnd: string;
  status: string[];
  queuesIds: string[];
  showAll: string;
};

export async function statisticsController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const statisticsService = fastify.services.statisticsService;
  fastify.post(
    "/relatorio-chamado",

    async (request: FastifyRequest, reply: FastifyReply) => {
      const { startDate } = request.body as any;

      try {
        const data = await statisticsService.chamadosByPeriodo(startDate);

        return reply.code(200).send(data);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/generate-Report",
    {
      schema: {
        body: {
          type: "object",
          required: ["empresaId", "period", "now"],
          properties: {
            startDate: { type: "string" },
            period: { type: "string" },
            now: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { empresaId, period, now } = request.body as any;
      const empresaIdNumber = parseInt(empresaId, 10);
      const dataPesquisaObj = new Date(period);
      const primeiroDiaMes = new Date(
        dataPesquisaObj.getFullYear(),
        dataPesquisaObj.getMonth(),
        1
      );
      try {
        const relatorio = (await statisticsService.donwloadRelatorio(
          empresaIdNumber,
          period
        )) as RelatorioData;

        const filePath = path.join(
          __dirname,
          `../../../public/relatorio-${relatorio.dadosEmpresa.name}.pdf`
        );
        await new Promise((resolve, reject) => {
          generatePDF(
            relatorio.dadosEmpresa,
            `${formatador.format(primeiroDiaMes)} à ${formatador.format(
              dataPesquisaObj
            )}`,
            relatorio.chamados,
            now,
            relatorio.dadosContrato
          );
          // Espera o arquivo ser realmente criado antes de continuar
          setTimeout(() => {
            if (fs.existsSync(filePath)) {
              resolve(true);
            } else {
              reject(new Error("Falha ao gerar o PDF"));
            }
          }, 2000); // Aguarda 2 segundos antes de verificar se o arquivo foi salvo
        });
        // 📌 Fastify -> enviar arquivo como download
        reply.header(
          "Content-Disposition",
          `attachment; filename=relatorio-${relatorio.dadosEmpresa.name}.pdf`
        );
        reply.type("application/pdf");

        const stream = fs.createReadStream(filePath);

        // remove o arquivo após enviar
        stream.on("close", () => {
          fs.unlink(filePath, (err) => {
            if (err) console.error("Erro ao excluir o arquivo:", err);
          });
        });

        return reply.send(stream);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.get(
    "/dash-tickets-queues",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId, userId, profile } = request.user as any;
      const { dateStart, dateEnd, status, queuesIds } =
        request.query as IndexQuery;
      try {
        const payload = {
          dateEnd,
          dateStart,
          status,
          queuesIds,
          tenantId,
          userId,
          profile,
          showAll: profile === "admin" ? true : false,
        };

        const tickets = await statisticsService.ticketsQueues(payload);

        return reply.code(200).send(tickets);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}
