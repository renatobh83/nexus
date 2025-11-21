import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify"
import { handleServerError } from "../../errors/errors.helper";
import { count } from "console";

export async function ContatoController(
    fastify: FastifyInstance,
    opts: FastifyPluginOptions
) {
    const conattoService = fastify.services.contatoService
    fastify.get("/", async (
        request: FastifyRequest,
        reply: FastifyReply
    ) => {
   
        const { searchParam, pageNumber } = request.query as any;
        try {
            const options = {
                currentPage: pageNumber
            }
            const { contatos, count, hasMore } = await conattoService.ListarContatos(searchParam, options)
    
            return reply
                .code(200)
                .send({contatos, count, hasMore});
        } catch (error) {
            return handleServerError(reply, error);
        }
    })
}