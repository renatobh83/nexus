import { Ticket } from "@prisma/client";
import {
  obterSessaoUsuarioRedis,
  salvarSessaoUsuario,
} from "../../../../ultis/redisCache";
import { dispatchAction } from "./actions/action_dispatcher";

export const actionsIntegracaoGenesis = async (
  integracao: any,
  ticket: Ticket,
  msg: any
) => {
  const action = msg.data.webhook?.acao!;

  const sessao = await obterSessaoUsuarioRedis(ticket.id); // carrega ou cria a sessão no Redis
  const input: any = ticket.lastMessage;

  try {
    const result = await dispatchAction({
      action,
      integracao,
      ticket,
      msg,
      sessao,
      input,
    });

    await salvarSessaoUsuario(ticket.id, sessao);
    return result;
  } catch (error) {
    console.error("Erro na execução da ação:", error);
    return "Desculpe, ocorreu um erro inesperado. Por favor, tente novamente mais tarde.";
  }
};
