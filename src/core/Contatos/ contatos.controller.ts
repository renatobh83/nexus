import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify"
import { handleServerError } from "../../errors/errors.helper";


interface ContactData {
    name: string;
    number: string;
    email?: string;
    dtaniversario?: Date | undefined;
    identifier?: string;
    telegramId?: number;
    isGroup?: boolean;
    empresas?: string;
    profilePicUrl?: any;
    isWAContact?: boolean;
    serializednumber?: string;
    id?: {
        user: string;
    };
}
export async function ContatoController(
    fastify: FastifyInstance,
    opts: FastifyPluginOptions
) {
    const conatoService = fastify.services.contatoService
    fastify.get("/", async (
        request: FastifyRequest,
        reply: FastifyReply
    ) => {

        const { searchParam, pageNumber } = request.query as any;
        try {
            const options = {
                currentPage: pageNumber
            }
            const { contatos, count, hasMore } = await conatoService.ListarContatos(searchParam, options)

            return reply
                .code(200)
                .send({ contatos, count, hasMore });
        } catch (error) {
            return handleServerError(reply, error);
        }
    })
    fastify.post(
        "/",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["name", "number"],
                    properties: {
                        number: { type: "string" },
                        name: { type: "string" },
                        email: {
                            anyOf: [
                                { type: "string", format: "email" },
                                { type: "string", maxLength: 0 }, // permite vazio
                            ],
                        },
                        dtaniversario: { type: "string" },
                        identifier: { type: "string" },
                        telegramId: { type: "number" },
                        isGroup: { type: "boolean" },
                        profilePicUrl: { type: "string" },
                        isWAContact: { type: "boolean" },
                        serializednumber: { type: "string" },
                        id: {
                            anyOf: [
                                { type: "object", items: { type: "number" } },
                                { type: "string" }, // permite vazio
                            ],
                        },
                    },
                },
            },
        },
        async (
            request: FastifyRequest<{ Body: ContactData }>,
            reply: FastifyReply
        ) => {

            const newContato = request.body;

            newContato.number = newContato.number.toString();
            try {
                const contact = await conatoService.findOrCreate({
                    email: newContato.email,
                    serializednumber: newContato.serializednumber,
                    telegramId: newContato.telegramId

                }, newContato)
                return reply.code(200).send(contact);
            } catch (error) {
                return handleServerError(reply, error);
            }
        }
    );
    fastify.get("/:contactId", async (
        request: FastifyRequest,
        reply: FastifyReply
    ) => {
        const { contactId } = request.params as any;
        // const { tenantId } = request.user as any;
        const id = parseInt(contactId)
        if(!isNaN){
            return
        }
        try {
            const contato = await conatoService.findContato({id: id})
            // const contato = await ShowContactService({ id: contactId, tenantId });
            return reply.code(200).send(contato);
        } catch (error) {
            
            return handleServerError(reply, error);
        }
    });
    fastify.delete("/:contactId",async (
        request: FastifyRequest,
        reply: FastifyReply
    ) => {
        const { contactId } = request.params as any;
        // const { tenantId } = request.user as any;
        const id = parseInt(contactId)
        if(!isNaN){
            return
        }
        try {
            const contato = await conatoService.deleteContato(id)
            // const contato = await ShowContactService({ id: contactId, tenantId });
            return reply.code(200).send("Contato Deletado");
        } catch (error) {
            
            return handleServerError(reply, error);
        }
    })
    fastify.put("/:contactId", async (
  request: FastifyRequest<{ Body: ContactData }>,
  reply: FastifyReply
) => {
  const { contactId } = request.params as any;
//   const { tenantId } = request.user as any;
  const newContato = request.body;

  newContato.number = newContato.number?.toString();
  try {
      const id = parseInt(contactId)
        if(!isNaN){
            return
        }
    const contact = await conatoService.updateContato(id,newContato )
    return reply.code(200).send(contact);
  } catch (error) {
    
    return handleServerError(reply, error);
  }
})

}