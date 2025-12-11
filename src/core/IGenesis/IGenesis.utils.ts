import { IGConfirmacao } from "@prisma/client";
import { getFastifyApp } from "../../api";
import { addJob } from "../../lib/Queue";

const MessageForCancel = [
  "nao",
  "não",
  2,
  "2",
  "cancelar",
  "cancela",
  "cancelamento",
];
const MessageForConfirm = [
  "sim",
  1,
  "1",
  "confirma",
  "confirmar",
  "confirmacao",
];

export const CheckServiceGenesisIntegrcao = async (
  dadosConfirmacao: any,
  payload: any
): Promise<void> => {
  const bot = JSON.parse(dadosConfirmacao.notificacao).bot;
  const integracaoServices = getFastifyApp().services.iGenesisServices;

  switch (bot) {
    case "agenda":
      await integracaoServices.findConfirmacao(payload);
      break;
    default:
      break;
  }
};

export const extratcInforAgendamneto = async (params: {
  body: {
    paciente_nome: string;
    atendimento_data: string;
    bot: string;
    dados_agendamentos: any[];
  };
}) => {
  const idExternos = params.body.dados_agendamentos.map((i) => i.idExterno);
  const horarioMaisCedo = params.body.dados_agendamentos.reduce(
    (min, agendamento) => {
      return agendamento.Hora < min.Hora ? agendamento : min;
    },
    params.body.dados_agendamentos[0]
  );
  return {
    idExternos,
    horarioMaisCedo,
  };
};

interface ListResponseProps {
  title: string;
  singleSelectReply: { selectedRowId: string };
}
interface ResquestProps {
  id: string;
  body?: string;
  from: string;
  listResponse?: ListResponseProps;
  content: string;
}

export const ProcessReturnMessage = async (
  msg: ResquestProps,
  ticket: IGConfirmacao
): Promise<void> => {
  let responseFromClient: string | null = null;
  if (msg.listResponse) {
    responseFromClient = msg.listResponse.singleSelectReply.selectedRowId;
  } else {
    responseFromClient = msg.body || msg.content;
  }
  const contatoSend = msg.from;

  GetMessageConfirma(responseFromClient, contatoSend, ticket);
};
export const GetMessageConfirma = (
  response: string | number,
  contatoSend: string,
  ticket: IGConfirmacao
): void => {
  const responseFormatted =
    typeof response === "string" ? response.trim().toLowerCase() : response;

  let status: string;

  // Permite apenas respostas únicas, sem espaços extras
  if (
    typeof responseFormatted === "string" &&
    responseFormatted.includes(" ")
  ) {
    status = "invalid"; // Resposta inválida
  } else if (MessageForCancel.includes(responseFormatted)) {
    status = "cancel";
  } else if (MessageForConfirm.includes(responseFormatted)) {
    status = "confirm";
  } else {
    status = "invalid"; // Resposta não reconhecida
  }
  const dataToJob = {
    contatoSend,
    ticket,
    response, // Adiciona a resposta original do cliente
    status, // Adiciona o status identificado
  };

  addJob("WebHookConfirma", dataToJob);
};
