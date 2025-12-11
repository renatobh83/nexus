import { getFastifyApp } from "../api";
import { bodyMessage } from "../core/IGenesis/Templates/textoIGIntegracao";
import { redisClient } from "../lib/redis";
import { getWbot } from "../lib/wbot";
import { logger } from "../ultis/logger";

const sending: any = {};
// Função para gerar um delay aleatório (ex: entre 5 e 20 segundos)
const getRandomDelay = () =>
  Math.floor(Math.random() * (20000 - 5000 + 1)) + 5000;
const LOCK_TIMEOUT = 30; // Tempo em segundos que o lock será mantido
enum STATUS_CONFIRMACAO {
  RESPONDIDO = "RESPONDIDO",
  CONFIRMADO = "CONFIRMADO",
  CANCELADO = "CANCELADO",
  ERROR = "ERRO NO PROCESSO DE CONFIRMAÇÂO",
  SEM_RESPOSTA = "SEM RESPOSTA",
  ENVIADA = "ENVIADA",
}

export default {
  key: "SendMessageConfirmar",
  options: {
    delay: getRandomDelay(),
    attempts: 2,
    removeOnComplete: 2,
    removeOnFail: 5,
  },
  async handle(data: any) {
    const { ticket, sessionId, body } = data;

    const greetings = [
      `Olá ${body.paciente_nome}. 😊`,
      `Oi ${body.paciente_nome}, tudo bem?`,
      `Prezado(a) ${body.paciente_nome},`,
    ];
    const contato = ticket.contato;
    if (!contato) {
      logger.error("Cotnato nao informado");
      throw new Error("Contato não informado");
    }
    const wbot = getWbot(sessionId);
    const randomGreeting =
      greetings[Math.floor(Math.random() * greetings.length)];
    const lockKey = `lock:${contato}`;
    const isLocked = await redisClient.exists(lockKey);
    if (isLocked) {
      // Se o lock existe, ignora a nova adição à fila
      logger.info(
        `Mensagem para ${contato} não foi adicionada à fila (lock ativo).`
      );
      return;
    }
    try {
      await redisClient.set(lockKey, "locked", "EX", LOCK_TIMEOUT, "NX");
      if (sending[ticket.id]) return;
      sending[ticket.id] = true;
      const quantidadeExames = body.dados_agendamentos.length;
      const plural =
        quantidadeExames > 1 ? "exames agendados" : "exame agendado";
      const horarioTexto =
        quantidadeExames > 1
          ? `a partir das *${ticket.atendimentoHora}*`
          : `às ${ticket.atendimentoHora}`;

      const sendMessage = await wbot.sendListMessage(contato, {
        buttonText: "Confirmar",
        description: bodyMessage(randomGreeting, plural, ticket, horarioTexto),
        sections: [
          {
            title: "Confirmação do agendamento",
            rows: [
              {
                rowId: "1",
                title: "✅ Confirmar ",
                description: "Desejo confirmar o agendamento.",
              },
              {
                rowId: "2",
                title: "🚫 Cancelar",
                description: "Desejo cancelar o agendamento.",
              },
            ],
          },
        ],
      });

      if (sendMessage) {
        try {
          await getFastifyApp().services.iGenesisServices.updateTicketConfirmacao(
            ticket.id,
            {
              enviada: new Date(sendMessage.timestamp * 1000),
              status: STATUS_CONFIRMACAO.ENVIADA,
              lastMessageAt: sendMessage.timestamp,
              lastMessage: "Confirmação enviada",
            }
          );
        } catch (error) {
          console.log(error);
        }
      }
      sending[ticket.id] = false;
      return {
        success: true,
        message: "Mensagem Confirmacao enviada!",
      };
    } catch (error: any) {
      if (!error.message.includes("Lock ativo")) {
        logger.error(`Erro ao enviar para ${contato}: ${error.message}`);
      }
      // Libera o lock em caso de falha para permitir novas tentativas.
      await redisClient.del(lockKey);
      throw new Error(error);
    }
  },
};
