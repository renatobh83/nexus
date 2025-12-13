import { IGConfirmacao, Integracoes, Ticket } from "@prisma/client";
import { getFastifyApp } from "../../api";
import { addJob } from "../../lib/Queue";
import { getApiInstance } from "./helpers/apiInstance";
import { v4 as uuidV4 } from "uuid";
import fs from "node:fs/promises";

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

      return data;
    } catch (error) {
      console.error("Error na confirmacao de exames");
    }
  }
};
interface CancelarAgendamentoProps {
  integracao: any;
  cdAtendimento: number;
}

export const CancelarAgendamento = async ({
  cdAtendimento,
  integracao,
}: CancelarAgendamentoProps) => {
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

// Helper Flow

import axios from "axios";
import { AppError } from "../../errors/errors.helper";
import BuildSendMessageService from "../../api/helpers/BuildSendMessage";
import { createWriteStream } from "node:fs";
import path from "node:path";
interface ConsultaPacienteProps {
  senha: string;
  integracao: any;
  cpf: string;
}
export const ConsultaPaciente = async ({
  senha,
  integracao,
  cpf,
}: ConsultaPacienteProps) => {
  try {
    const url = "doPacienteLogin";
    const body = new URLSearchParams();
    body.append("id", cpf);
    body.append("pw", senha);

    const URL_FINAL = `${integracao.config_json.baseUrl}${url}`;

    const { data } = await axios.post(URL_FINAL, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return data;
  } catch (error: any) {
    return error.response.data;
  }
};
interface ConsultaAgendamentosProps {
  ticket: Ticket;
  integracao: any;
  codPaciente: string;
  sessao: any;
}
export const ConsultaAgendamentos = async ({
  sessao,
  integracao,
  codPaciente,
}: ConsultaAgendamentosProps) => {
  try {
    const body = new URLSearchParams();
    body.append("cd_paciente", codPaciente);
    body.append("token", sessao.dadosPaciente.ds_token);

    const url = `doListaAgendamento`;

    const URL_FINAL = `${integracao.config_json.baseUrl}${url}`;
    const instanceApi = await getApiInstance(integracao);

    const { data } = await instanceApi.post(URL_FINAL, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (data.length) {
      return data
        .filter(
          (i: { ds_status: string; dt_data: string; dt_hora: string }) => {
            if (i.ds_status === "CANCELADO") return false;

            const [dia, mes, ano] = i.dt_data.split("/");
            const hora = i.dt_hora?.split(" - ")[0] || "00:00";
            const [h, m] = hora.split(":").map(Number);

            const dataAgendada = new Date(
              `${ano}-${mes}-${dia}T${String(h).padStart(2, "0")}:${String(
                m
              ).padStart(2, "0")}:00`
            );

            return dataAgendada.getTime() > Date.now(); // só mantém se a data/hora for no futuro
          }
        )
        .sort(
          (
            a: {
              dt_data: { split: (arg0: string) => [any, any, any] };
              dt_hora: string;
            },
            b: {
              dt_data: { split: (arg0: string) => [any, any, any] };
              dt_hora: string;
            }
          ) => {
            const [diaA, mesA, anoA] = a.dt_data.split("/");
            const [diaB, mesB, anoB] = b.dt_data.split("/");

            const dataA = new Date(`${anoA}-${mesA}-${diaA}`);
            const dataB = new Date(`${anoB}-${mesB}-${diaB}`);

            if (dataA.getTime() !== dataB.getTime()) {
              return dataA.getTime() - dataB.getTime(); // primeiro por data (decrescente)
            }

            const horaA = a.dt_hora?.split(" - ")[0] || "00:00";
            const horaB = b.dt_hora?.split(" - ")[0] || "00:00";

            const [hA, mA] = horaA.split(":").map(Number);
            const [hB, mB] = horaB.split(":").map(Number);

            const minutosA = hA! * 60 + mA!;
            const minutosB = hB! * 60 + mB!;

            return minutosA - minutosB; // ordem decrescente por hora
          }
        )
        .slice(0, 5);
    }
    return [];
  } catch (error: any) {
    throw new AppError(error, 500);
  }
};

interface ConsultaAtendimentoProps {
  integracao: any;
  codigoPaciente: string;
  token: string;
}

export const ConsultaAtendimentos = async ({
  integracao,
  codigoPaciente,
  token,
}: ConsultaAtendimentoProps) => {
  try {
    const url = `/doListaAtendimento`;
    const URL_FINAL = `${integracao.config_json.baseUrl}${url}`;

    const body = new URLSearchParams();
    body.append("cd_paciente", codigoPaciente);
    body.append("token", codigoPaciente);

    const instanceApi = await getApiInstance(integracao);

    const { data } = await instanceApi.post(URL_FINAL, body);

    if (data.length) {
      return data
        .filter((i: { nr_laudo: null }) => i.nr_laudo !== null)
        .filter((a: { sn_assinado: boolean }) => a.sn_assinado === true)
        .sort((a: { dt_data: string }, b: { dt_data: string }) => {
          const dateA = new Date(a.dt_data.split("/").reverse().join("-"));
          const dateB = new Date(b.dt_data.split("/").reverse().join("-"));
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5); // Seleciona os 5 registros mais recentes
    }
    return [];
  } catch (error: any) {
    throw new AppError(error, 500);
  }
};

interface GetLaudoProps {
  integracao: any;
  cdExame: number;
  ticket: Ticket;
  exame: string;
  cdPaciente: string;
}

export const GetLaudo = async ({
  cdExame,
  integracao,
  ticket,
  exame,
  cdPaciente,
}: GetLaudoProps) => {
  const URL_FINAL = `${integracao.config_json.baseUrl}`.replace("se1/", "");

  const newURL = `${URL_FINAL}/www/doLaudoDownload?cd_exame=${cdExame}&cd_paciente=${cdPaciente}&cd_funcionario=1&sn_entrega=false`;

  const body = new URLSearchParams();
  body.append("cd_exame", cdExame.toString());

  // gera nome único no public/
  const publicFolder = path.join(process.cwd(), "public");
  const uniqueName = `${exame}-${uuidV4()}.pdf`;
  const filePath = path.join(publicFolder, uniqueName);

  try {
    const instanceApi = await getApiInstance(integracao);

    const { data } = await instanceApi.get(newURL, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/pdf",
      },
      responseType: "stream",
    });

    // grava stream no arquivo da pasta pública
    const writer = createWriteStream(filePath);
    data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // envia usando o nome relativo (acessível via public/)
    await BuildSendMessageService({
      ticket,
      tenantId: ticket.tenantId,
      msg: {
        type: "MediaField",
        id: uuidV4(),
        data: {
          mediaUrl: uniqueName, // << só o nome do arquivo, já que está em public/
          name: "Laudo Exame",
          message: {
            mediaType: "document",
          },
        },
      },
    });
  } catch (error) {
    console.error("Erro ao GetLaudo exame:", error);
    throw error;
  } finally {
    // remove arquivo depois do envio
    await fs.unlink(filePath).catch(() => {});
  }
};

export const getPreparo = async (
  chosenIndex: string,
  integracao: any,
  ticket: Ticket
) => {
  const url = `doProcedimentoPreparo`;

  const URL_FINAL = `${integracao.config_json.baseUrl}${url}`;
  const body = new URLSearchParams();
  body.append("cd_procedimento", chosenIndex);

  const publicFolder = path.join(process.cwd(), "public");
  const filePath = path.resolve(
    publicFolder,
    `Preparo exame_${chosenIndex}.html`
  );
  try {
    const instanceApi = await getApiInstance(integracao);
    const { data } = await instanceApi.post(URL_FINAL, body);

    if (!data[0].bb_preparo) {
      return null;
    }
    const blob = data[0].bb_preparo;
    const buffer = Buffer.from(blob, "base64");

    await fs.writeFile(filePath, buffer);

    await BuildSendMessageService({
      ticket,
      tenantId: ticket.tenantId,
      msg: {
        type: "MediaField",
        id: uuidV4(),
        data: {
          mediaUrl: `Preparo exame_${chosenIndex}.html`,
          name: "Preparo Exame",
          message: {
            mediaType: "document",
          },
        },
      },
    });
  } catch (error) {
    console.error("doProcedimentoPreparo", error);
    throw error;
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
};
