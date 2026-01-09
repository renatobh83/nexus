import { IGConfirmacao, Integracoes, Ticket } from "@prisma/client";
import { getFastifyApp } from "../../api";
import FormData from "form-data";
import { addJob } from "../../lib/Queue";
import { getApiInstance } from "./helpers/apiInstance";
import { v4 as uuidV4 } from "uuid";
import fs from "node:fs/promises";
import axios from "axios";
import { AppError } from "../../errors/errors.helper";
import BuildSendMessageService from "../../api/helpers/BuildSendMessage";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { sign } from "jsonwebtoken";
import { customAlphabet } from "nanoid";
import { redisClient } from "../../lib/redis";
import { SessaoUsuario } from "./types";

interface ConsultaPacienteProps {
  senha: string;
  integracao: any;
  cpf: string;
}

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
export const ListarUnidades = async (integracao: any, token: string) => {
  const url = `/doListaEmpresa`;
  const URL_FINAL = `${integracao.config_json.baseUrl}${url}`;
  const body = new URLSearchParams();
  body.append("token", token);

  try {
    const instanceApi = await getApiInstance(integracao);
    const { data } = await instanceApi.post(URL_FINAL, body);
    return data;
  } catch (error) {
    console.error("Erro ao confirmar exame:", error);
    throw error;
  }
};
export const ListarPlanos = async (integracao: any, token: string) => {
  const url = `/doListaPlano`;
  const URL_FINAL = `${integracao.config_json.baseUrl}${url}`;
  const body = new URLSearchParams();
  body.append("token", token);

  try {
    const instanceApi = await getApiInstance(integracao);
    const { data } = await instanceApi.post(URL_FINAL, body);
    return data;
  } catch (error) {
    console.error("Erro ao confirmar exame:", error);
    throw error;
  }
};
interface GetListProcedimento {
  integracao: any;
  cdPlano: number;
  cdEmpresa: number;
  token: string;
}

export const getListaProcedimento = async ({
  integracao,
  cdPlano,
  cdEmpresa,
  token,
}: GetListProcedimento) => {
  const url = `doListaProcedimento`;
  const URL_FINAL = `${integracao.config_json.baseUrl}${url}`;
  const body = new URLSearchParams();
  body.append("cd_plano", cdPlano.toString());
  body.append("cd_empresa", cdEmpresa.toString());
  body.append("token", token);
  try {
    const instanceApi = await getApiInstance(integracao);
    const { data } = await instanceApi.post(URL_FINAL, body);

    return data;
  } catch (error) {
    console.error("Erro ao confirmar exame:", error);
    throw error;
  }
};
interface GetObsPlanoProps {
  integracao: any;
  cdPlano: number;
  token: string;
}
export const ObsplanoAsync = async ({
  integracao,
  cdPlano,
  token,
}: GetObsPlanoProps) => {
  const url = `doPlanoAviso?cd_plano=${cdPlano}&token=${token}`;
  const URL_FINAL = `${integracao.config_json.baseUrl}${url}`;

  try {
    const instanceApi = await getApiInstance(integracao);
    const body = new URLSearchParams();
    body.append("cd_plano", cdPlano.toString());
    body.append("token", token);

    const { data } = await instanceApi.post(URL_FINAL, body);

    const infoPlano = data[0];
    1;
    if (!infoPlano.ds_infoweb) return false;
    const decoded = Buffer.from(infoPlano.ds_infoweb, "base64").toString(
      "utf-8"
    );
    return decoded;
  } catch (error) {
    console.error("Erro observacao plano:", error);
    throw error;
  }
};

export const gerarIntervalosPorPeriodo = (
  periodo: "manha" | "tarde" | "noite"
): string[] => {
  const intervalos: string[] = [];
  let horaInicial: number;
  let horaFinal: number;

  switch (periodo) {
    case "manha":
      horaInicial = 7;
      horaFinal = 12;
      break;
    case "tarde":
      horaInicial = 13;
      horaFinal = 18;
      break;
    case "noite":
      horaInicial = 19;
      horaFinal = 22;
      break;
    default:
      return [];
  }

  for (let h = horaInicial; h <= horaFinal; h++) {
    intervalos.push(`${String(h).padStart(2, "0")}:00`);
  }

  return intervalos;
};
export const adicionarMinutos = (horario: string, minutos: number): string => {
  const [hora, minuto] = horario.split(":").map(Number);
  const data = new Date();
  data.setHours(hora!, minuto! + minutos, 0, 0);

  const novaHora = data.getHours().toString().padStart(2, "0");
  const novoMinuto = data.getMinutes().toString().padStart(2, "0");

  return `${novaHora}:${novoMinuto}`;
};
export function montarJsonAgendaSemanal(sessao: SessaoUsuario): string {
  // 1. Contar quantidades por cd_procedimento
  const quantidadePorProcedimento: Record<string, number> = {};

  sessao.examesParaAgendar.forEach((exame) => {
    const cd = exame;
    quantidadePorProcedimento[cd] = (quantidadePorProcedimento[cd] || 0) + 1;
  });

  // 2. Criar lista única de procedimentos (sem repetição)
  const procedimentosUnicos = sessao.examesParaAgendar.filter(
    (exame, index, self) => index === self.findIndex((e) => e === exame)
  );

  // 3. Montar array com os dados completos e nr_quantidade correta
  const examesConvertidos = procedimentosUnicos
    .map((exameAgendado) => {
      const exameCompleto = sessao.listaExames.find(
        (e) => e.cd_procedimento === +exameAgendado
      );

      if (!exameCompleto) {
        console.warn(
          `Exame não encontrado para cd_procedimento: ${exameAgendado}`
        );
        return null;
      }
      const cd_medico_selecionado =
        sessao.medicosSelecionados?.[exameCompleto.cd_modalidade] || 0;

      return {
        cd_modalidade: exameCompleto.cd_modalidade,
        cd_procedimento: exameCompleto.cd_procedimento,
        ds_procedimento: exameCompleto.ds_procedimento,
        cd_medico: cd_medico_selecionado,
        cd_plano: +sessao.planoSelecionado,
        cd_subplano: 0,
        cd_empresa: +sessao.unidadeSelecionada,
        nr_tempo: exameCompleto.nr_tempo,
        nr_tempo_total: exameCompleto.nr_tempo,
        nr_valor: exameCompleto.nr_valor,
        sn_especial: exameCompleto.sn_especial,
        nr_quantidade: quantidadePorProcedimento[exameAgendado],
      };
    })
    .filter(Boolean); // Remove os nulls

  const json = JSON.stringify(examesConvertidos);
  const base64 = Buffer.from(json).toString("base64");

  return base64;
}
interface GetPropsAgendaSemanal {
  integracao: any;
  dadosPesquisa: {
    cd_horario?: string;
    tokenPaciente: string;
    cd_paciente: string;
    dt_data: string;
    dt_hora: string;
    dt_hora_fim: string;
    js_exame: any;
  };
  token: string;
}

export const doAgendaSemanal = async ({
  integracao,
  dadosPesquisa,
  token,
}: GetPropsAgendaSemanal) => {
  const URL_FINAL = `${integracao.config_json.baseUrl}doAgendaSemanal?token=${token}`;
  // 1. Criar o form-data real
  const form = new FormData();
  form.append("dt_data", dadosPesquisa.dt_data); // '14/05/2025'
  form.append("dt_hora", dadosPesquisa.dt_hora); // '08:00'
  form.append("dt_hora_fim", dadosPesquisa.dt_hora_fim); // '23:49'
  form.append("js_exame", JSON.stringify(dadosPesquisa.js_exame));
  try {
    const instanceApi = await getApiInstance(integracao);
    const { data } = await instanceApi.post(URL_FINAL, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${dadosPesquisa.tokenPaciente}`, // ou onde estiver seu token
      },
    });
    return data;
  } catch (error) {
    console.error("Erro ao confirmar exame:", error);
    throw error;
  }
};
interface doAgendaHorario {
  integracao: any;
  token: string;
  dadosPesquisa: {
    cd_horario?: string;
    tokenPaciente: string;
    cd_paciente: string;
    dt_data: string;
    dt_hora: string;
    dt_hora_fim: string;
    js_exame: any;
  };
}
export const doAgendaHorario = async ({
  integracao,
  dadosPesquisa,
  token,
}: doAgendaHorario) => {
  const URL_FINAL = `${integracao.config_json.baseUrl}doAgendaHorario?token=${token}`;
  // 1. Criar o form-data real
  const form = new FormData();
  form.append("dt_data", dadosPesquisa.dt_data); // '14/05/2025'
  form.append("dt_hora", dadosPesquisa.dt_hora); // '08:00'
  form.append("dt_hora_fim", dadosPesquisa.dt_hora_fim); // '23:49'
  form.append("js_exame", JSON.stringify(dadosPesquisa.js_exame));
  try {
    const instanceApi = await getApiInstance(integracao);
    const { data } = await instanceApi.post(URL_FINAL, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${dadosPesquisa.tokenPaciente}`, // ou onde estiver seu token
      },
    });
    return data;
  } catch (error) {
    console.error("Erro ao confirmar exame:", error);
    throw error;
  }
};
export const gerarLinkRegistro = async (user: string, dataIntegracao: any) => {
  const { FRONTEND_URL, BACKEND_URL } = process.env;
  const payload = {
    identifier: user,
    id: dataIntegracao.id,
    tenantId: dataIntegracao.tenantId,
  };
  const token = sign(
    payload,
    "78591a1f59eda6e939d7a7752412b364a5218eef12a839616af49080860273c7",
    { expiresIn: "15m" }
  );
  // Link original com o token
  const fullUrl = `${FRONTEND_URL}/register?token=${token}`;
  const nanoidSafe = customAlphabet(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    6
  );
  // Encurta com Redis
  const code = nanoidSafe();
  const expireSeconds = 15 * 60;

  await redisClient.setex(`short:${code}`, expireSeconds, fullUrl);
  const shortUrl = `${BACKEND_URL}/api/v1/r/${code}`;

  return shortUrl;
};
interface GetPropsAgendaPost {
  integracao: any;
  dadosPesquisa: {
    cd_horario?: string;
    tokenPaciente: string;
    cd_paciente: string;
    dt_data: string;
    dt_hora: string;
    dt_hora_fim: string;
    js_exame: any;
  };
}
export const doAgendaPost = async ({
  integracao,
  dadosPesquisa,
}: GetPropsAgendaPost) => {
  const URL_FINAL = `${integracao.config_json.baseUrl}doAgendaPost`;
  // 1. Criar o form-data real
  const form = new FormData();
  form.append("cd_paciente", dadosPesquisa.cd_paciente);
  form.append("cd_horario", dadosPesquisa.cd_horario);
  form.append("dt_data", dadosPesquisa.dt_data);
  form.append("dt_hora", dadosPesquisa.dt_hora);
  form.append("dt_hora_fim", dadosPesquisa.dt_hora_fim);
  form.append("js_exame", JSON.stringify(dadosPesquisa.js_exame));
  try {
    const instanceApi = await getApiInstance(integracao);
    const { data } = await instanceApi.post(URL_FINAL, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${dadosPesquisa.tokenPaciente}`, // ou onde estiver seu token
      },
    });
    return data;
  } catch (error) {
    console.error("Erro ao confirmar exame:", error);
    throw error;
  }
};
type ListaExameMedicoProps = {
  cdProcedimento: number;
  integracao: any;
  token: string;
  cdEmpresa: number;
};
export const ListaMedicoExame = async ({
  cdProcedimento,
  integracao,
  token,
  cdEmpresa,
}: ListaExameMedicoProps) => {
  const body = new URLSearchParams();
  body.append("cd_procedimento", cdProcedimento.toString());
  body.append("token", token);
  body.append("cd_empresa", cdEmpresa.toString());

  const url = `doListaMedico`;
  const URL_FINAL = `${integracao.config_json.baseUrl}${url}`;
  const instanceApi = await getApiInstance(integracao);
  const { data } = await instanceApi.post(URL_FINAL, body, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  return data;
};
type Sessao = {
  dadosPaciente: {
    ds_token: string;
  };
  planoSelecionado: string;
};
type PrecoExameProps = {
  cdProcedimento: number;
  sessao: Sessao;
  integracao: any;
};
export const PrecoExame = async ({
  cdProcedimento,
  sessao,
  integracao,
}: PrecoExameProps) => {
  const { planoSelecionado, dadosPaciente } = sessao;
  const body = new URLSearchParams();
  body.append("cd_procedimento", cdProcedimento.toString());
  body.append("token", dadosPaciente.ds_token);
  body.append("cd_plano", planoSelecionado);
  const url = `doProcedimentoValor`;
  const URL_FINAL = `${integracao.config_json.baseUrl}${url}`;
  console.log(URL_FINAL);
  const instanceApi = await getApiInstance(integracao);
  try {
    const { data } = await instanceApi.post(URL_FINAL, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return data[0];
  } catch (error: any) {
    console.log(error);
    return error.response.data;
  }
};
export function examesUnico(sessao: SessaoUsuario): any[] {
  // 1. Contar quantidades por cd_procedimento
  const quantidadePorProcedimento: Record<string, number> = {};

  sessao.examesParaAgendar.forEach((exame) => {
    const cd = exame;
    quantidadePorProcedimento[cd] = (quantidadePorProcedimento[cd] || 0) + 1;
  });

  // 2. Criar lista única de procedimentos (sem repetição)
  const procedimentosUnicos = sessao.examesParaAgendar.filter(
    (exame, index, self) => index === self.findIndex((e) => e === exame)
  );

  // 3. Montar array com os dados completos e nr_quantidade correta
  const examesConvertidos = procedimentosUnicos
    .map((exameAgendado) => {
      const exameCompleto = sessao.listaExames.find(
        (e) => e.cd_procedimento === +exameAgendado
      );

      if (!exameCompleto) {
        console.warn(
          `Exame não encontrado para cd_procedimento: ${exameAgendado}`
        );
        return null;
      }

      return {
        cd_modalidade: exameCompleto.cd_modalidade,
        cd_procedimento: exameCompleto.cd_procedimento,
        ds_procedimento: exameCompleto.ds_procedimento,
        cd_medico: 0,
        cd_plano: +sessao.planoSelecionado,
        cd_subplano: 0,
        cd_empresa: +sessao.unidadeSelecionada,
        nr_tempo: exameCompleto.nr_tempo,
        nr_tempo_total: exameCompleto.nr_tempo,
        nr_valor: exameCompleto.nr_valor,
        sn_especial: exameCompleto.sn_especial,
        nr_quantidade: quantidadePorProcedimento[exameAgendado],
      };
    })
    .filter(Boolean); // Remove os nulls
  return examesConvertidos ? examesConvertidos : [];
}
export const generateLinkPdf = async (plano: number, integracao: any) => {
  const { BACKEND_URL } = process.env;
  const { id, tenantId } = integracao;
  const payload = { cdPlano: plano, id: id, tenantId: tenantId };

  const token = sign(
    payload,
    "78591a1f59eda6e939d7a7752412b364a5218eef12a839616af49080860273c7",

    { expiresIn: "25m" }
  );

  // Link original com o token
  const fullUrl = `${BACKEND_URL}/pdf/${plano}?token=${token}`;

  const nanoidSafe = customAlphabet(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    6
  );
  // Encurta com Redis
  const code = nanoidSafe();
  const expireSeconds = 25 * 60;

  await redisClient.setex(`short:${code}`, expireSeconds, fullUrl);

  const shortUrl = `${BACKEND_URL}/r/${code}`;

  return shortUrl;
};
