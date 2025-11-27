import * as Yup from "yup";
import { isMatch } from "date-fns";

import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ERRORS, handleServerError } from "../../errors/errors.helper";

export async function tenantController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const service = fastify.services;
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.user as any;

    try {
      //   const tenant = await ListDadosTenantService({ tenantId });
      const tenant = await service.tenantService.dadosNotaFiscal(tenantId);
      reply.code(200).send(tenant);
    } catch (error) {
      return handleServerError(reply, error);
    }
  });
  fastify.post(
    "/nf-dados",
    {
      schema: {
        body: {
          type: "object",
          required: ["address", "dadosNfe", "razaoSocial"],
          properties: {
            address: { type: "object" },
            dadosNfe: { type: "object" },
            razaoSocial: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.user as any;
      const { address, dadosNfe, razaoSocial } = request.body as any;
      try {
        await service.tenantService.updateDadosNotafiscal(tenantId, {
          tenantId,
          address,
          dadosNfe,
          name: razaoSocial,
        });

        reply.code(200).send("Dados atualizados");
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.put(
    "/business-hours",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId, profile } = request.user as any;
      try {
        if (profile !== "admin") {
          return reply
            .code(ERRORS.unauthorizedAccess.statusCode)
            .send(ERRORS.unauthorizedAccess.message);
        }

        const businessHours = request.body as [];

        const schema = Yup.array().of(
          Yup.object().shape({
            day: Yup.number().required().integer(),
            label: Yup.string().required(),
            type: Yup.string().required(),
            hr1: Yup.string()
              .required()
              .test("isHoursValid", "${path} is not valid", (value) =>
                isMatch(value || "", "HH:mm")
              ),

            hr2: Yup.string()
              .required()
              .test("isHoursValid", "${path} is not valid", (value) =>
                isMatch(value || "", "HH:mm")
              ),
            hr3: Yup.string()
              .required()
              .test("isHoursValid", "${path} is not valid", (value) =>
                isMatch(value || "", "HH:mm")
              ),
            hr4: Yup.string()
              .required()
              .test("isHoursValid", "${path} is not valid", (value) =>
                isMatch(value || "", "HH:mm")
              ),
          })
        );

        try {
          await schema.validate(businessHours);
        } catch (error: any) {
          return reply
            .code(ERRORS.UnprocessableEntity.statusCode)
            .send(ERRORS.UnprocessableEntity.message);
        }

        await service.tenantService.updateBusinessHours(
          tenantId,
          businessHours
        );

        reply.code(200).send("Horario atualizado");
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.get(
    "/business-hours",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.user as any;

      try {
        const tenant = await service.tenantService.showBussinesHours(tenantId);

        reply.code(200).send(tenant);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.put(
    "/message-business-hours",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId, profile } = request.user as any;
      try {
        if (profile !== "admin") {
          return reply
            .code(ERRORS.unauthorizedAccess.statusCode)
            .send(ERRORS.unauthorizedAccess.message);
        }

        const { messageBusinessHours } = request.body as any;

        if (!messageBusinessHours) {
          return reply
            .code(ERRORS.MessageNoFound.statusCode)
            .send(ERRORS.MessageNoFound.message);
        }

        await service.tenantService.updateMessageBusinessHours(
          tenantId,
          messageBusinessHours
        );

        reply.code(200).send("Messagem Alterada");
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}
