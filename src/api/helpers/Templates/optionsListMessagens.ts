export const ListMessageWelcome = () => {
  return {
    buttonText: " Opções ",
    description: "🤖 Para começarmos, escolha a opção desejada:",
    sections: [
      {
        title: "Toque para selecionar um item.",
        rows: [
          {
            rowId: "consulta",
            title: "Consultar Chamado",
            description: "🔎 Para consultar um chamado.",
          },
          {
            rowId: "abrir",
            title: "Falar no suporte",
            description: "🏷️ Falar no suporte",
          },
          {
            rowId: "3",
            title: "Finalizar atendimento",
            description: "❌ Finalizando o seu atendimento.",
          },
        ],
      },
    ],
  };
};
export const ListMessageWelcomeTelegram = () => {
  return {
    body: "🤖 Para começarmos, escolha a opção desejada: 👇",
    hasButtons: true,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🏷️ Falar no suporte", callback_data: "abrir" }],
        [{ text: "🔎 Consultar chamado", callback_data: "consultar" }],
        [{ text: "❌ Finalizar atendimento", callback_data: "3" }],
      ],
    },
  };
};
export const ListMessageEmpresaWpp = (row: any[]) => {
  return {
    buttonText: " Opções ",
    description: "🤖 Por favor, selecione uma a empresa.",
    sections: [
      {
        title: "Selecione uma empresa para qual deseja consultar o chamado",
        rows: row,
      },
    ],
  };
};
export const ListMessageEmpresaTbot = (row: any[]) => {
  return {
    body: "🤖 Selecione uma empresa para qual deseja consultar o chamado 👇",
    hasButtons: true,
    reply_markup: {
      inline_keyboard: row,
    },
  };
};

export const ListMessageChamadosWpp = (row: any[]) => {
  return {
    buttonText: " Opções ",
    description:
      "🤖 Por favor, selecione uma das opções abaixo para consultar o chamado.",
    sections: [
      {
        title: "Selecione um chamado para qual deseja maiores detalhes",
        rows: row,
      },
    ],
  };
};
export const ListMessageChamadosTbot = (row: any[]) => {
  return {
    body: "🤖 Por favor, selecione uma das opções abaixo para consultar o chamado.",
    hasButtons: true,
    reply_markup: {
      inline_keyboard: row,
    },
  };
};

export const SemChamadoTbot = (row: any[]) => {
  return {
    body: "🤖 Você não possui chamados!",
    hasButtons: true,
    reply_markup: {
      inline_keyboard: row,
    },
  };
};
export const SemChamadoWpp = (row: any[]) => {
  return {
    buttonText: " Opções ",
    description: "🤖 Você não possui chamados!",
    sections: [
      {
        title: "Selecione uma opção",
        rows: row,
      },
    ],
  };
};
export const SemEmpresaAssociadoWpp = (row: any[]) => {
  return {
    buttonText: " Opções ",
    description: "🤖 Seu contato não esta associado a nenhuma empresa!",
    sections: [
      {
        title: "Selecione uma opção",
        rows: row,
      },
    ],
  };
};
export const SemEmpresaAssociadoTbot = (row: any[]) => {
  return {
    body: "🤖 Seu contato não esta associado a nenhuma empresa!",
    hasButtons: true,
    reply_markup: {
      inline_keyboard: row,
    },
  };
};

export const TemplateMessage = (data: any) => {
  const comentarios = data.comentarios;
  const idChamado = data.id;
  const status = data.status;
  const assunto = data.assunto;
  const descricao = data.descricao;
  const conclusao = data.conclusao;

  return `
_____________________________________

📌 Detalhes do Chamado

🔹 ID: ${idChamado}
🔹 Status: ${status}
🔹 Assunto: ${assunto}
🔹 Descrição: ${descricao}

${
  comentarios && comentarios.length > 0
    ? comentarios
        .filter(
          (c: { emailEnviadoEm: any; mensagemEnviadoEm: any }) =>
            c.emailEnviadoEm || c.mensagemEnviadoEm
        )
        .map(
          (comentario: { [x: string]: any }) => `
📅 ${comentario.date}
✍️ ${comentario.author}
🗨️ ${comentario.comentario.replace(/\n/g, "<br>")} `
        )
        .join("\n")
    : "Nenhum comentário disponível"
}

${conclusao ? `✅ Conclusão: ${conclusao} ` : "⚠️ Chamado aberto."}
_____________________________________
🔹 Para voltar ao menu anterior, digite 1.
🔹 Para encerrar o atendimento, digite 3.
`;
};
