// import Ticket from "../../../../models/Ticket";
// import { ResponseListaAgendamentos, ResponseListaAtendimento } from "../types";
// import { gerarIdUnico } from "../utils/utils";
// import { salvarHorarioRedis } from "../Lib/horarioStoreRedis";
// import {
//   gerarMensagemExamesMedicosTelegram,
//   gerarMensagemExamesMedicosWpp,
//   gerarMensagemTelegram,
//   gerarMensagemWpp,
//   loopTelegram,
//   loopWpp,
// } from "../../../../utils/templateButtons";
// import {
//   gerarMensagemExameComPreparo,
//   gerarMensagemExameSemPreparo,
//   gerarMensagemListaMedicos,
//   gerarMensagemLoopProcedimento,
// } from "../utils/gerarMensagemExame";

import { Ticket } from "@prisma/client";
import {
  InlineButton,
  ResponseListaAgendamentos,
  ResponseListaAtendimento,
} from "../../../../IGenesis/types";
import { getFastifyApp } from "../../../../../api";
import {
  gerarMensagemExamesMedicosTelegram,
  gerarMensagemExamesMedicosWpp,
  gerarMensagemTelegram,
  gerarMensagemWpp,
  loopTelegram,
  loopWpp,
} from "../../../../../ultis/templateButtons";
import { REDIS_KEYS, setCache } from "../../../../../ultis/redisCache";

export function generateWhatsAppOptions(
  buttonText: string,
  description: string,
  sections: any[],
  footer: string
) {
  return {
    buttonText,
    description,
    sections,
    footer,
  };
}

export function generateTelegramOptions(body: string, rows: any[]) {
  return {
    body,
    hasButtons: true,
    reply_markup: {
      inline_keyboard: rows,
    },
  };
}

export function generateServiceSelectionMessage(
  servicosDisponiveis: string[],
  channel: string
) {
  if (channel === "whatsapp") {
    const rowsListMessage = [
      ...servicosDisponiveis.map((servico) => ({
        rowId: `${servico}`,
        title: servico,
        description: `Desejo acessar: ${servico}`,
      })),
      {
        rowId: "suporte",
        title: "📞 Falar com o suporte",
        description: "Entre em contato com nossa equipe.",
      },
      {
        rowId: "3",
        title: "❌ Finalizar atendimento",
        description: "Encerrar esta conversa.",
      },
    ];
    return generateWhatsAppOptions(
      " Opções ",
      "🤖 Para qual serviço deseja atendimento.",
      [
        {
          title: "Selecione uma opção",
          rows: rowsListMessage,
        },
      ],
      "_Selecione a opção desejada_"
    );
  } else {
    const rowsListMessage = servicosDisponiveis.map((servico) => [
      {
        callback_data: `${servico}`,
        text: `${servico} `,
      },
    ]);
    rowsListMessage.push([
      {
        callback_data: "suporte",
        text: "📞 Falar com o suporte",
      },
    ]);
    rowsListMessage.push([
      {
        callback_data: "3",
        text: "❌ Finalizar Atendimento",
      },
    ]);
    return generateTelegramOptions(
      "🤖 Para qual serviço deseja atendimento.",
      rowsListMessage
    );
  }
}

export function generateAppointmentListMessage(
  listaAgendamentos: ResponseListaAgendamentos[]
) {
  let message = "📅 *Seus próximos agendamentos:*\n\n";
  listaAgendamentos.forEach(
    (
      item: { ds_modalidade: any; dt_data: any; dt_hora: any },
      index: number
    ) => {
      message += `📍 *${index + 1}. Exame de:* ${item.ds_modalidade}\n`;
      message += `📆 *Data:* ${item.dt_data} | 🕒 *Hora:* ${item.dt_hora}\n\n`;
    }
  );
  message +=
    "✅ Para confirmar um agendamento, digite o número correspondente.\n";
  message += "📄 6 - Para preparo.\n";
  message += "🔙 7 - Voltar menu anterior.\n";
  message += "📞 9 - Falar com o suporte.\n";
  message += "❌ 8 - Para encerrar atendimento.\n\n";
  message += "_Digite o número da opção desejada_.";
  return message;
}

export function generateNoAppointmentMessage() {
  let message = `🤖 Queremos avisá-lo que, no momento, você não tem nenhum agendamento conosco.
Se precisar marcar um horário ou tiver qualquer dúvida, estamos à disposição para ajudar! É só nos chamar. 📅✨\n\n`;
  message += "📞 9 - Falar com o suporte.\n";
  message += "🔙 7 - Para menu anterior.\n";
  message += "❌ 8 - Para encerrar.\n\n";
  message += "_Digite o número da opção desejada_.";
  return message;
}

export function generateLaudoListMessage(
  listaAtendimentos: ResponseListaAtendimento[]
) {
  let message =
    "👋 *Prezado(a),* segue a relação dos seus atendimentos recentes com laudos disponíveis:\n\n" +
    "📌 *Para acessar um laudo, informe o número correspondente à opção desejada:*\n\n";

  listaAtendimentos.forEach((item, index) => {
    message += `📝 *${index + 1}.* 📅 *Data do Exame:* ${item.dt_data}\n`;
    message += `    *Descrição:* ${item.ds_procedimento}\n\n`;
  });

  message +=
    "📅 Caso precise de um laudo de outro período, entre em contato com nossa central para solicitar.\n\n" +
    "📞 9 - Falar com o suporte.\n" +
    "🔄 6 - Retornar ao menu.\n" +
    "❌ 7 -  Encerrar o atendimento.\n\n" +
    "_Digite o número da opção desejada_.";
  return message;
}

export function generateNoLaudoMessage() {
  let message =
    "⚠️ *Não encontramos exames recentes com laudo disponível.*\n\n" +
    "📞 Por favor, entre em contato com a nossa *central de atendimento* para mais informações.\n\n" +
    "🙏 Agradecemos pela sua compreensão!" +
    "📞 9 - Falar com o suporte.\n" +
    "🔄 6 - Retornar ao menu.\n" +
    "❌ 7 - Encerrar o atendimento.\n\n" +
    "_Digite o número da opção desejada_.";
  return message;
}

export function generateLaudoPdfMessage() {
  let message =
    "📅 Caso precise de um laudo de outro período, entre em contato com nossa central para solicitar.\n\n" +
    "📞 9 - Falar com o suporte.\n" +
    "🔄 6 - Retornar ao menu.\n" +
    "❌ 7 - Encerrar o atendimento.\n\n" +
    "_Digite o número da opção desejada_.";
  return message;
}

export function generatePreparoSelectionMessage(
  listaAgendamentos: ResponseListaAgendamentos[],
  channel: string
) {
  if (channel === "whatsapp") {
    const rowsListMessage = [
      ...listaAgendamentos.map((agenda) => ({
        rowId: `Preparo_${agenda.cd_procedimento}`,
        title: `📌 ${agenda.ds_modalidade}`,
        description: `${agenda.dt_data} - ${agenda.dt_hora}`,
      })),
      {
        rowId: "suporte",
        title: "📞 Falar com o suporte",
        description: "Entre em contato com nossa equipe.",
      },
      {
        rowId: "3",
        title: "❌ Finalizar atendimento",
        description: "Encerrar esta conversa.",
      },
    ];

    return generateWhatsAppOptions(
      "📋 Escolher agendamento",
      "Selecione o agendamento para consultar o preparo:",
      [
        {
          title: "📍 Agendamento disponíveis",
          rows: rowsListMessage,
        },
      ],
      "_Selecione a opção desejada_"
    );
  } else {
    const rowsListMessage = listaAgendamentos.map((agenda) => [
      {
        callback_data: `Preparo_${agenda.cd_procedimento}`,
        text: `📌 ${agenda.dt_data} ${
          agenda.dt_hora
        } - ${agenda.ds_modalidade.slice(0, 10)}`,
      },
    ]);
    rowsListMessage.push([
      {
        callback_data: "suporte",
        text: "📞 Falar com o suporte",
      },
    ]);
    rowsListMessage.push([
      {
        callback_data: "3",
        text: "❌ Finalizar Atendimento",
      },
    ]);
    return generateTelegramOptions(
      "Selecione o agendamento para consultar o preparo:",
      rowsListMessage
    );
  }
}

export function generatePatientNotFoundMessage(channel: string) {
  if (channel === "whatsapp") {
    const options = {
      buttonText: "🤖 Como podemos seguir?",
      description: "Desculpe, não localizei seu cadastro. 😔",
      sections: [
        {
          title: "📍 Menu Principal",
          rows: [
            {
              rowId: "cadastrar",
              title: "🗒️  Me cadastrar",
              description: "Receber link para cadastro.",
            },
            {
              rowId: "suporte",
              title: "📞 Falar com o suporte",
              description: "Entre em contato com nossa equipe.",
            },
            {
              rowId: "3",
              title: "❌ Finalizar atendimento",
              description: "Encerrar esta conversa.",
            },
          ],
        },
      ],
    };
    return options;
  } else {
    const rows = [
      [
        {
          callback_data: "cadastrar",
          text: "Receber link para cadastro",
        },
      ],
    ];
    rows.push([
      {
        callback_data: "suporte",
        text: "📞 Falar com o suporte",
      },
    ]);
    rows.push([
      {
        callback_data: "3",
        text: "❌ Finalizar Atendimento",
      },
    ]);
    const options = {
      body: `Desculpe, não localizei seu cadastro. 😔
Como podemos seguir?`,
      hasButtons: true,
      reply_markup: {
        inline_keyboard: rows,
      },
    };
    return options;
  }
}

export function generateWelcomeMessage(patientName: string, channel: string) {
  if (channel === "whatsapp") {
    const options = {
      buttonText: "📌 Escolha uma opção",
      description: `🤖 Olá, ${patientName}! Como podemos te ajudar hoje?`,
      sections: [
        {
          title: "📍 Menu Principal",
          rows: [
            {
              rowId: "servicos",
              title: "🔍 Consultar serviços disponíveis",
              description: "Veja quais serviços estão disponíveis para você.",
            },
            {
              rowId: "suporte",
              title: "📞 Falar com o suporte",
              description: "Entre em contato com nossa equipe.",
            },
            {
              rowId: "3",
              title: "❌ Finalizar atendimento",
              description: "Encerrar esta conversa.",
            },
          ],
        },
      ],
    };

    return options;
  } else {
    const rows = [
      [
        {
          callback_data: "servicos",
          text: "🔍 Consultar serviços disponíveis",
        },
      ],
    ];
    rows.push([
      {
        callback_data: "suporte",
        text: "📞 Falar com o suporte",
      },
    ]);
    rows.push([
      {
        callback_data: "3",
        text: "❌ Finalizar Atendimento",
      },
    ]);

    const options = {
      body: `🤖 Olá, ${patientName}! Como podemos te ajudar hoje?`,
      hasButtons: true,
      reply_markup: {
        inline_keyboard: rows,
      },
    };
    return options;
  }
}
export function generatePeriodoMessage(periodos: string[], channel: string) {
  if (channel === "whatsapp") {
    const rowsListMessage = [
      ...periodos.map((periodo) => ({
        rowId: `periodo_${periodo}`,
        title: `${periodo}`,
        description: `${periodo}`,
      })),
      {
        rowId: "2",
        title: "⬅️ Voltar",
        description: "Voltar ao menu anterior.",
      },
    ];

    const options = {
      buttonText: " Opções ",
      description: "🤖 Selecione para qual periodo deseja agendar.",
      sections: [
        {
          title: "Selecione uma opção",
          rows: rowsListMessage,
        },
      ],
    };

    return options;
  } else {
    const rowsListMessage = periodos.map((periodo) => [
      {
        callback_data: `periodo_${periodo}`,
        text: `${periodo}`,
      },
    ]);

    rowsListMessage.push([{ text: "⬅️ Voltar", callback_data: "2" }]);
    const options = {
      body: "🤖 Selecione para qual periodo deseja agendar.",
      hasButtons: true,
      reply_markup: {
        inline_keyboard: rowsListMessage,
      },
    };
    return options;
  }
}
export function generateSendPreparoMessage(preparos: any[]) {
  if (preparos.some((item) => item === null)) {
    let message =
      "📄 Procedimento não tem preparo.\n\n" +
      "📞 9 - Falar com o suporte.\n" +
      "🔄 6 - Retornar ao menu.\n" +
      "❌ 7 - Encerrar o atendimento.\n\n" +
      "_Digite o número da opção desejada_.";

    return message;
  }
  let message =
    "📄 Caso precise do preparo de outro agendamento, entre em contato com nossa central para solicitar.\n\n" +
    "📞 9 - Falar com o suporte.\n" +
    "🔄 6 - Retornar ao menu.\n" +
    "❌ 7 - Encerrar o atendimento.\n\n" +
    "_Digite o número da opção desejada_.";
  return message;
}

export function generateConfirmaMessage(confirmacoes: any[]) {
  const message =
    confirmacoes.length > 0
      ? `🤖 Exame(s) confirmado com sucesso.\n\n
🔄 2 - Retornar ao menu.\n
❌ 3 - Encerrar o atendimento.\n\n
_Digite o número da opção desejada_.`
      : `🤖 Infelizamente não conseguimos confirmar o exame selecionado.\n\n
Se precisar favor entrar em contato com a nossa central, estamos à disposição.\n
📞 1 - Falar com o suporte.\n
🔄 2 - Retornar ao menu.\n
❌ 3 - Encerrar o atendimento.\n\n
_Digite o número da opção desejada_.`;
  return message;
}
export function generateAgendamentoMessage(
  channel: string,
  listaUnidades: any[]
) {
  if (channel === "whatsapp") {
    const rowsListMessage = [
      ...listaUnidades.map((unidade) => ({
        rowId: `empresa_${unidade.cd_empresa}`,
        title: `📌 ${unidade.ds_empresa}`,
        description: `Local: ${
          unidade.ds_endereco || "Endereço não informado"
        }\n⏰ Atendimento: ${
          unidade.ds_horario || "Horário não informado"
        }\n📞 Contato: ${unidade.nr_telefone || "Não informado"}`,
      })),
    ];

    const options = {
      buttonText: "📋 Escolher unidade",
      description: "Selecione a unidade para qual deseja agendar seu exame:",
      sections: [
        {
          title: "Selecione uma unidade para prosseguir no agendamento",
          rows: rowsListMessage,
        },
      ],
      footer: "_Selecione a opção desejada_",
    };
    return options;
  } else {
    const buttonsPerRow = 2;
    const allButtons: InlineButton[] = listaUnidades.map((unidade) => ({
      callback_data: `selecEmpresa_${unidade.cd_empresa}`,
      text: `${unidade.ds_empresa}`,
    }));
    const rowsListMessage: InlineButton[][] = [];
    for (let i = 0; i < allButtons.length; i += buttonsPerRow) {
      rowsListMessage.push(allButtons.slice(i, i + buttonsPerRow));
    }

    const options = {
      body: "🤖 Para unidade você deseja agendar?",
      hasButtons: true,
      reply_markup: {
        inline_keyboard: rowsListMessage,
      },
    };
    return options;
  }
}

export function generatePlanosMessage(channel: string, planos: any[]) {
  if (channel === "whatsapp") {
    const rowsListMessage = [
      ...planos.map((plano: { cd_plano: any; ds_plano: any }) => ({
        rowId: `plano_${plano.cd_plano}`,
        title: `${plano.ds_plano}`,
      })),
    ];

    rowsListMessage.push({
      rowId: "voltar_plano",
      title: "⬅️ Voltar",
    });
    const options = {
      buttonText: "📋 Selecionar o plano",
      description:
        "🤖 Aqui está a lista de planos disponíveis para agendamento. Por favor, selecione o plano desejado diretamente na lista abaixo.",
      sections: [
        {
          title: "Por favor, selecione o seu plano de saúde:",
          rows: rowsListMessage,
        },
      ],
      footer: "_Selecione a opção desejada_",
    };
    return options;
  } else {
    const buttonsPerRow = 2;
    const allButtons: InlineButton[] = planos.map(
      (plano: { cd_plano: any; ds_plano: any }) => ({
        callback_data: `plano_${plano.cd_plano}`,
        text: `${plano.ds_plano}`,
      })
    );
    const rowsListMessage: InlineButton[][] = [];
    for (let i = 0; i < allButtons.length; i += buttonsPerRow) {
      rowsListMessage.push(allButtons.slice(i, i + buttonsPerRow));
    }
    rowsListMessage.push([
      { text: "⬅️ Voltar", callback_data: "voltar_plano" },
    ]);
    const options = {
      body: "🤖 Aqui está a lista de planos disponíveis para agendamento. Por favor, selecione o plano desejado diretamente na lista abaixo.",
      hasButtons: true,
      reply_markup: {
        inline_keyboard: rowsListMessage,
      },
    };
    return options;
  }
}

export function generateObsPlanoSelecionado(
  texto: boolean | string,
  channel: string
) {
  const textoFinal = texto
    ? `🤖 ${texto}\n\nAs instruções acima descrevem como o pedido médico deve estar. Está tudo conforme para prosseguirmos?`
    : "🤖 Este plano não possui instruções específicas. Podemos continuar?";

  if (channel === "whatsapp") {
    const rowsListMessage = [
      {
        rowId: "sim",
        title: "Continuar",
        description: "Continuar com agendamento.",
      },
      {
        rowId: "nao",
        title: "Finalizar atendimento",
        description: "Encerrar esta conversa.",
      },
    ];

    return generateWhatsAppOptions(
      " Opções ",
      textoFinal,
      [
        {
          title: "Selecione uma opção",
          rows: rowsListMessage,
        },
      ],
      "_Selecione a opção desejada_"
    );
  } else {
    const options = {
      body: textoFinal,
      hasButtons: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              callback_data: "sim",
              text: "Continuar",
            },
            {
              callback_data: "nao",
              text: "Cancelar",
            },
          ],
        ],
      },
    };
    return options;
  }
}
export async function generateProcedimentosMessage(
  channel: string,
  ticket: Ticket,
  procedimentos: any[],
  PREVIOUS_STEPID: string
) {
  if (procedimentos.length === 0) {
    await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
      stepChatFlow: PREVIOUS_STEPID,
      botRetries: ticket.botRetries! + 1,
      lastInteractionBot: new Date(),
    });
    let message = `🤖 Não conseguimos localizar o exame que você digitou.
Pode verificar se houve algum erro de digitação?
Caso contrário, esse exame pode não estar disponível para agendamento no momento.
Favor digitar novamente o exame que deseja agendar.\n\n`;
    return message;
  }
  PREVIOUS_STEPID = ticket.stepChatFlow as string;
  await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
    botRetries: 0,
    lastInteractionBot: new Date(),
  });
  if (channel === "whatsapp") {
    const rowsListMessage = [
      ...procedimentos.map(
        (procedimento: {
          cd_procedimento: any;
          ds_procedimento: any;
          ds_modalidade: any;
        }) => ({
          rowId: `exame_${procedimento.cd_procedimento}`,
          title: `${procedimento.ds_procedimento}`,
          description: `${procedimento.ds_modalidade}`,
        })
      ),
      {
        rowId: "1",
        title: "📞 Falar com o suporte",
        description: "Exame não consta na lista.",
      },
      {
        rowId: "2",
        title: "⬅️ Voltar",
        description: "Voltar ao menu anterior.",
      },
    ];

    const options = {
      buttonText: " Opções ",
      description:
        "🤖 Aqui está a lista de exames disponíveis para agendamento. Por favor, selecione o exame desejado diretamente na lista abaixo.",
      sections: [
        {
          title: "Selecione uma opção",
          rows: rowsListMessage,
        },
      ],
      footer: "_Selecione a opção desejada_",
    };

    return options;
  } else {
    const rowsListMessage = procedimentos.map(
      (procedimento: {
        cd_procedimento: any;
        ds_procedimento: any;
        ds_modalidade: any;
      }) => [
        {
          callback_data: `exame_${procedimento.cd_procedimento}`,
          text: `${procedimento.ds_procedimento}-${procedimento.ds_modalidade} `,
        },
      ]
    );

    rowsListMessage.push([
      { text: "📞 Falar com o suporte", callback_data: "1" },
    ]);
    rowsListMessage.push([{ text: "⬅️ Voltar", callback_data: "2" }]);
    const options = {
      body: "🤖 Aqui está a lista de exames disponíveis para agendamento. Por favor, selecione o exame desejado diretamente na lista abaixo.",
      hasButtons: true,
      reply_markup: {
        inline_keyboard: rowsListMessage,
      },
    };
    return options;
  }
}
type Canal = "whatsapp" | "telegram";

interface MensagemInfo {
  texto: string;
  opcoes: { id: string; texto: string; description: string }[];
}

export function gerarMensagemExame(
  precoExame: string,
  perguntarPreferencia: boolean
): MensagemInfo {
  const isValid = parseFloat(precoExame.replace(",", ".")) !== 0;

  if (isValid && perguntarPreferencia) {
    return {
      texto: `💰 O exame possui um custo de R$ ${precoExame}.\n👨‍⚕️ Deseja selecionar um médico de sua preferência antes de prosseguirmos?`,
      opcoes: [
        {
          id: "selecionarMedico",
          texto: "Selecionar Médico",
          description: "Tenho preferência por médico",
        },
        {
          id: "naoSelecionar",
          texto: "Não Selecionar Médico",
          description: "Não tenho preferência por médico.",
        },
        { id: "cancelar", texto: "Cancelar", description: "Desejo cancelar" },
      ],
    };
  }

  if (isValid && !perguntarPreferencia) {
    return {
      texto: `💰 O exame selecionado possui um custo de R$ ${precoExame}.\n✅ Assim que confirmado, daremos continuidade ao agendamento.`,
      opcoes: [
        {
          id: "continuar",
          texto: "Continuar",
          description: "Desejo continuar.",
        },
        { id: "cancelar", texto: "Cancelar", description: "Desejo cancelar" },
      ],
    };
  }

  if (!isValid && perguntarPreferencia) {
    return {
      texto: `👨‍⚕️ Deseja selecionar um médico de sua preferência antes de prosseguirmos?`,
      opcoes: [
        {
          id: "selecionarMedico",
          texto: "Selecionar Médico",
          description: "Tenho preferência por médico",
        },
        {
          id: "naoSelecionar",
          texto: "Não Selecionar Médico",
          description: "Não tenho preferência por médico.",
        },
        { id: "cancelar", texto: "Cancelar", description: "Desejo cancelar" },
      ],
    };
  }

  return {
    texto: `Podemos prosseguir com o seu agendamento?`,
    opcoes: [
      { id: "continuar", texto: "Continuar", description: "Desejo continuar." },
      { id: "cancelar", texto: "Cancelar", description: "Desejo cancelar" },
    ],
  };
}

export function gerarMensagemListaMedicos(exames: any[]) {
  return {
    texto: `🤖 Selecione o médico de sua preferência:`,
    opcoes: exames.map((medico, index) => ({
      id: `medico_${medico.cd_medico}`, // ou `${medico.cd_medico}`
      texto: medico.ds_medico,
      description: `Exame: ${medico.ds_procedimento}`,
    })),
  };
}
export function gerarMensagemLoopProcedimento() {
  return {
    texto: "🤖 Perfeito! Você deseja agendar mais algum outro exame?",
    opcoes: [
      {
        id: "sim",
        texto: "Agendar outro exame",
        description: "Tenho mais exames para agendar",
      },
      {
        id: "nao",
        texto: "Somente esse exame",
        description: "Não tenho outro exame.",
      },
    ],
  };
}

export function gerarMensagemExameComPreparo() {
  return {
    texto:
      "📄 Segue orientações a serem seguidas para realização do seu exame.",
    opcoes: [
      {
        id: "1",
        texto: "Podemos prosseguir",
        description: "Continuar com o processo de agendamento.",
      },
      {
        id: "2",
        texto: "Menu anterior",
        description: "Desejo voltar ao menu anterior.",
      },
      {
        id: "3",
        texto: "Cancelar",
        description: "Desejo cancelar.",
      },
    ],
  };
}

export function gerarMensagemExameSemPreparo() {
  return {
    texto: "📄 Procedimento não tem preparo.",
    opcoes: [
      {
        id: "1",
        texto: "Podemos prosseguir",
        description: "Continuar com o processo de agendamento.",
      },
      {
        id: "2",
        texto: "Voltar ao menu anterior",
        description: "Desejo voltar ao menu anterior.",
      },
      {
        id: "3",
        texto: "Cancelar",
        description: "Desejo cancelar.",
      },
    ],
  };
}

export function generatePreparoAutoAgedamentoMessage(
  channel: string,
  preparos: any[]
) {
  if (preparos.some((item) => item === null)) {
    if (channel === "whatsapp") {
      const wpp = loopWpp(gerarMensagemExameSemPreparo());
      return wpp;
    } else {
      const { texto, markup } = loopTelegram(gerarMensagemExameSemPreparo());
      const options = {
        body: texto,
        hasButtons: true,
        reply_markup: markup.reply_markup,
      };
      return options;
    }
    // let message =
    //   "📄 Procedimento não tem preparo.\n" +
    //   "Podemos prosseguir ?\n\n" +
    //   "1 - Sim.\n" +
    //   "2 - Voltar ao menu anterior.\n" +
    //   "3 - Cancelar.\n\n" +
    //   "_Digite o número da opção desejada_.";

    // return message;
  }
  if (channel === "whatsapp") {
    const wpp = loopWpp(gerarMensagemExameComPreparo());
    return wpp;
  } else {
    const { texto, markup } = loopTelegram(gerarMensagemExameComPreparo());
    const options = {
      body: texto,
      hasButtons: true,
      reply_markup: markup.reply_markup,
    };
    return options;
  }

  let message =
    "📄 Segue orientações a serem seguidas para realização do seu exame.\n\n" +
    "Podemos prosseguir ?\n\n" +
    "1 - Sim.\n" +
    "2 - Voltar ao menu anterior.\n" +
    "3 - Cancelar.\n\n" +
    "_Digite o número da opção desejada_.";
  return message;
}
export function generateIntervaloHorarioMessage(
  channel: string,
  intervalos: string[]
) {
  if (channel === "whatsapp") {
    const rowsListMessage = [
      ...intervalos.map((intervalo) => ({
        rowId: `intervalo_${intervalo}`,
        title: `${intervalo}`,
        description: `${intervalo}`,
      })),
      {
        rowId: "2",
        title: "⬅️ Voltar",
        description: "Voltar ao menu anterior.",
      },
    ];

    const options = {
      buttonText: " Opções ",
      description: "Selecione para qual intervalo deseja agendar.",
      sections: [
        {
          title: "Selecione uma opção",
          rows: rowsListMessage,
        },
      ],
      footer: "_Selecione a opção desejada_",
    };

    return options;
  } else {
    const rowsListMessage = intervalos.map((intervalo) => [
      {
        callback_data: `intervalo_${intervalo}`,
        text: `${intervalo}`,
      },
    ]);

    rowsListMessage.push([{ text: "⬅️ Voltar", callback_data: "2" }]);
    const options = {
      body: "Selecione para qual intervalo deseja agendar.",
      hasButtons: true,
      reply_markup: {
        inline_keyboard: rowsListMessage,
      },
    };
    return options;
  }
}
export async function generateHorariosDisponivelMessage(
  horarios: any[],
  channel: string
) {
  const horariosDisponiveis = horarios.filter(
    (horario: { cod: string }) => horario.cod.trim() !== ""
  );
  if (horariosDisponiveis.length === 0) {
    const texto = `🤖 Não conseguimos localizar horario disponivel para o(s) exame(s) que você selecionou.
Se precisar de ajuda ou quiser conferir outras opções, estou aqui para auxiliar!
Como devemos prosseguir?`;
    if (channel === "whatsapp") {
      const rowsListMessage = [
        {
          rowId: "next",
          title: "Proxima semana",
          description: "Desejo pesquisar na proxima semana.",
        },
        {
          rowId: "mais",
          title: "+ 20 minutos",
          description: "Desejo pesquisar outro intervalo.",
        },
        {
          rowId: "suporte",
          title: "📞 Falar no suporte",
          description: "Desejo falar no suporte.",
        },
      ];

      return {
        sections: [
          {
            title: "Opções disponíveis",
            rows: rowsListMessage,
          },
        ],
        buttonText: "Escolha uma opção",
        description: texto,
        footer: "_Selecione a opção desejada_",
      };
    } else {
      const rowsListMessage = [
        [
          { text: "Proxima semana", callback_data: "next" },
          { text: "+ 20 minutos", callback_data: "mais" },
          { text: "📞 Falar no suporte", callback_data: "suporte" },
        ],
      ];
      const options = {
        body: texto,
        hasButtons: true,
        reply_markup: {
          inline_keyboard: rowsListMessage,
        },
      };
      return options;
    }
  }
  if (channel === "whatsapp") {
    const rowsListMessage = await Promise.all(
      horariosDisponiveis.map(
        async (horario: { cod: any; dia: any; hora: any }) => {
          const id = Math.random().toString(36).substring(2, 8);

          await setCache(REDIS_KEYS.horarioAgendamento(id), {
            codigos: horario.cod.trim(), // ou um array, se for o caso
            dia: horario.dia,
            hora: horario.hora,
          });

          return {
            rowId: `horario_${id}`,
            title: `${horario.dia} - ${horario.hora}`,
          };
        }
      )
    );

    rowsListMessage.push({
      rowId: "next",
      title: "Proxima semana",
    });
    rowsListMessage.push({
      rowId: "mais",
      title: "+ 20 minutos",
    });
    const options = {
      buttonText: "📅  Horários clique aqui",
      description:
        "🤖 Aqui está a lista de horarios disponíveis para agendamento. Por favor, selecione o horario desejado diretamente na lista abaixo.",
      sections: [
        {
          title: "Por favor, selecione o seu horário:",
          rows: rowsListMessage,
        },
      ],
      footer: "_Selecione a opção desejada_",
    };
    return options;
  } else {
    const buttonsPerRow = 2;
    const allButtons: InlineButton[] = await Promise.all(
      horariosDisponiveis.map(
        async (horario: { cod: any; dia: any; hora: any }) => {
          const id = Math.random().toString(36).substring(2, 8);

          await setCache(REDIS_KEYS.horarioAgendamento(id), {
            codigos: horario.cod.trim(), // ou um array, se for o caso
            dia: horario.dia,
            hora: horario.hora,
          });
          return {
            text: `${horario.dia} - ${horario.hora}`,
            callback_data: `horario_${id}`,
          };
        }
      )
    );

    const rowsListMessage: InlineButton[][] = [];
    for (let i = 0; i < allButtons.length; i += buttonsPerRow) {
      rowsListMessage.push(allButtons.slice(i, i + buttonsPerRow));
    }
    rowsListMessage.push([
      { text: "Proxima semana", callback_data: "next" },
      { text: "+ 20 minutos", callback_data: "mais" },
    ]);
    const options = {
      body: "🤖 Aqui está a lista de horarios disponíveis para agendamento. Por favor, selecione o horario desejado diretamente na lista abaixo.",
      hasButtons: true,
      reply_markup: {
        inline_keyboard: rowsListMessage,
      },
    };
    return options;
  }
}
export function generateConfirmarHorarioDisponivelMessage({
  dataHorario,
  exame,
  unidade,
  sessao,
}: any) {
  const { dia, hora } = dataHorario;
  const listaExames = exame.map((item: any) => `- ${item}`).join("\n");
  const total = sessao.valorTotalExames || 0;
  const totalFormatado = sessao.valorTotalExames.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const linhaValor = total > 0 ? `💰 *Valor total:* ${totalFormatado}\n` : "";
  const mensagem = `
📋 *Informações do seu agendamento:*

📅 *Data e horário:* ${dia} às ${hora}
🧪 *Exames:*
${listaExames}
${linhaValor}
🏥 *Unidade:* ${unidade.em}
📍 *Endereço:* ${unidade.endereco}



Deseja confirmar o agendamento?
1 - Confirmar
2 - Cancelar

_Digite o número da opção desejada_.
  `.trim();
  return mensagem;
}

export function generateConcluirAgendamento(response: any[]) {
  if (response.length > 0 && response[0].cd_atendimento) {
    return (
      `🤖 Agendamento realizado com suscesso!
Podemos ajudar em algo ?\n\n` +
      "1 - 📞 Falar com o suporte.\n" +
      "3 - ❌ Finalizar atendimento.\n\n" +
      "_Digite o número da opção desejada_."
    );
  } else {
    return (
      `🤖 Não conseguimos concluir o seu agendamento.
Favor acessar o nosso suporte!
Como devemos prosseguir?\n\n` +
      "1 - 📞 Falar com o suporte.\n" +
      "3 - ❌ Finalizar o atendimento.\n\n" +
      "_Digite o número da opção desejada_."
    );
  }
}
export function generateMessagemLoopExames(channel: string) {
  if (channel === "whatsapp") {
    const wpp = loopWpp(gerarMensagemLoopProcedimento());
    return wpp;
  } else {
    const { texto, markup } = loopTelegram(gerarMensagemLoopProcedimento());
    const options = {
      body: texto,
      hasButtons: true,
      reply_markup: markup.reply_markup,
    };
    return options;
  }
}
export function generatePrecoExameMensagem(
  channel: string,
  precoExame: string,
  perguntarPreferencia: boolean
) {
  try {
    if (channel === "whatsapp") {
      const wpp = gerarMensagemWpp(precoExame, perguntarPreferencia);
      return wpp;
    } else {
      const { texto, markup } = gerarMensagemTelegram(
        precoExame,
        perguntarPreferencia
      );

      const options = {
        body: texto,
        hasButtons: true,
        reply_markup: markup.reply_markup,
      };
      return options;
    }
  } catch (error) {
    console.log(error);
  }
}

export function generateListagemMedicoExame(
  channel: string,
  examesMedicos: any[]
) {
  if (channel === "whatsapp") {
    const wpp = gerarMensagemExamesMedicosWpp(examesMedicos);
    return wpp;
  }
  {
    const { texto, markup } = gerarMensagemExamesMedicosTelegram(examesMedicos);
    const options = {
      body: texto,
      hasButtons: true,
      reply_markup: markup.reply_markup,
    };
    return options;
  }
}
