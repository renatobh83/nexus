import {
  ListMessageChamadosTbot,
  ListMessageEmpresaTbot,
  SemChamadoTbot,
} from "../optionsListMessagens";

export const TemplateEmpresaSelecaoTbot = (contatoEmpresa: any[]) => {
  const rowsListMessage = contatoEmpresa.map((empresa) => [
    {
      callback_data: `Empresa_${empresa.id}`,
      text: `#️⃣ ${empresa.name}`,
    },
  ]);

  rowsListMessage.push([
    {
      callback_data: "3",
      text: "❌ Finalizar Atendimento",
    },
  ]);

  const options = ListMessageEmpresaTbot(rowsListMessage);

  return options;
};
export const TemplateChamadoSelecaoTbot = (tickets: any[]) => {
  const rows = [
    [
      {
        callback_data: "suporte",
        text: "🏷️ Falar no suporte",
      },
    ],
  ];

  const finalizarAtendimento = {
    callback_data: "3",
    text: "❌ Finalizar atendimento",
  };

  rows.push([finalizarAtendimento]);
  if (tickets.length === 0) {
    const options = SemChamadoTbot(rows);
    return options;
  }

  const rowsListMessage = tickets.map((chamado) => [
    {
      callback_data: `Chamado_${chamado.id}`,
      text: `#️⃣ ${chamado.id} - ${chamado.assunto} - ${chamado.status} `,
    },
  ]);

  rowsListMessage.push([
    {
      callback_data: "3",
      text: "❌ Finalizar Atendimento",
    },
  ]);

  const options = ListMessageChamadosTbot(rowsListMessage);
  return options;
};
