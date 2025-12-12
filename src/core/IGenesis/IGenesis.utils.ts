import { IGConfirmacao, Integracoes } from "@prisma/client";
import { getFastifyApp } from "../../api";
import { addJob } from "../../lib/Queue";
import { getApiInstance } from "./helpers/apiInstance";

interface Config {
  user: string;
  token: string;
  baseUrl: string;
  password: string;
  tokenJwt: string;
  urlIntegra: string;
  homologacao: boolean;
}
interface IIntegracao {
  id: number;
  name: string;
  config_json: string | null; // O campo problemático
  createdAt: string; // Ou Date, dependendo de como você o processa
  updatedAt: string; // Ou Date
  tenantId: number;
}
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

export const ConfirmarExameApi = async (
  cdAtendimento: number,
  integracao: Integracoes
) => {
  const body = new URLSearchParams();
  body.append("cd_atendimento", cdAtendimento.toString());
  const { baseUrl } = integracao.config_json as any;
  if (baseUrl) {
    const URL_FINAL = `${baseUrl}doAgendaConfirmar`;
    const instanceApi = await getApiInstance(integracao);
    try {
      const { data } = await instanceApi.post(URL_FINAL, body, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      console.log(data);
      return data;
    } catch (error) {
      console.error("Error na confirmacao de exames");
    }
  }
};
interface GetLaudoProps {
  integracao: any;
  cdAtendimento: number;
}

export const CancelarAgendamento = async ({
  cdAtendimento,
  integracao,
}: GetLaudoProps) => {
  const body = new URLSearchParams();
  body.append("cd_atendimento", cdAtendimento.toString());
  const url = `/doAgendaCancelar`;
  const URL_FINAL = `${integracao.config_json.baseUrl}${url}`;

  try {
    const instanceApi = await getApiInstance(integracao);
    const { data } = await instanceApi.post(URL_FINAL, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return data;
  } catch (error) {
    console.error("Erro ao cancelar exame:", error);
    throw error;
  }
};

export const getPreparoExteno = async ({ integracao, atedimento }) => {
  const url = `doProcedimentoPreparo`;
  const URL_FINAL = `${integracao.config_json.baseUrl}${url}`;
  const body = new URLSearchParams();
  body.append("cd_procedimento", atedimento);
  const instanceApi = await getApiInstance(integracao);
  try {
    const { data } = await instanceApi.post(URL_FINAL, body);

    if (!data[0].bb_preparo) {
      return null;
    }
    const blob = data[0].bb_preparo;

    return blob;
  } catch (error) {
    console.error("Erro get preparo", error);
  }
};
