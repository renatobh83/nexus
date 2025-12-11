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
  const apiUrl = getBaseUrlFromIntegracao(integracao);
  if (apiUrl) {
    const URL_FINAL = `${apiUrl}doAgendaConfirmar`;
    const instanceApi = await getApiInstance(integracao);
    try {
      const { data } = await instanceApi.post(URL_FINAL, body, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      return data;
    } catch (error) {
      console.error("Error na confirmacao de exames");
    }
  }
};

/**
 * Extrai e retorna o objeto de configuração parseado a partir de um objeto de integração.
 * Esta é uma função auxiliar interna, por isso não a exportamos.
 * @param integracao - O objeto de integração.
 * @returns O objeto IConfig ou null se a extração falhar.
 */
function getParsedConfig(integracao: Integracoes): Config {
  // 2. Tenta fazer o parse da string JSON.
  const configObject = integracao.config_json as any;
  return configObject;
}

/**
 * Obtém a baseUrl de um objeto de integração de forma segura.
 * Esta é a função que você usará em toda a sua aplicação.
 * @param integracao - O objeto de integração completo.
 * @returns A string da baseUrl ou undefined se não for encontrada.
 */
export function getBaseUrlFromIntegracao(
  integracao: Integracoes
): string | undefined {
  const config = getParsedConfig(integracao);
  const baseUrl = config.baseUrl;

  if (!baseUrl) {
    console.warn(
      `'baseUrl' não encontrada para a integração ID: ${integracao.id}`
    );
  }

  return baseUrl;
}

/**
 * Exemplo de outra função centralizada que você poderia criar.
 * @param integracao - O objeto de integração completo.
 * @returns O token JWT ou undefined.
 */
export function getTokenFromIntegracao(
  integracao: Integracoes
): string | undefined {
  const config = getParsedConfig(integracao);
  return config?.tokenJwt;
}
