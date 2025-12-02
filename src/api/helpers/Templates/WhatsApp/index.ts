import {
  ListMessageEmpresaWpp,
  SemChamadoWpp,
  ListMessageChamadosWpp,
} from "../optionsListMessagens";

export const TemplateEmpresaSelecaoWpp = (
  contatoEmpresa: any[]
): {
  buttonText: string;
  description: string;
  sections: {
    title: string;
    rows: any[];
  }[];
} => {
  const finalizarAtendimento = {
    rowId: "3",
    title: "Finalizar atendimento.",
    description: "❌ Finalizando o seu atendimento.",
  };
  const rowsListMessage = [
    ...contatoEmpresa.map((empresa) => ({
      rowId: `Empresa_${empresa.id}`,
      title: empresa.name,
      description: "📌 Deseja consultar para essa empresa",
    })),

    finalizarAtendimento, // Adiciona o novo item ao final do array
  ];

  const options = ListMessageEmpresaWpp(rowsListMessage);

  return options;
};
export const TemplateChamadoSelecaoWpp = (tickets: any[]) => {
  const finalizarAtendimento = {
    rowId: "3",
    title: "Finalizar atendimento.",
    description: "❌ Finalizando o seu atendimento",
  };

  if (tickets.length === 0) {
    const options = SemChamadoWpp([
      finalizarAtendimento,
      {
        rowId: "suporte",
        title: "Falar no suporte.",
        description: "🏷️ Falar no suporte",
      },
    ]);
    return options;
  }
  const rowsListMessage = [
    ...tickets.map((chamado) => ({
      rowId: `Chamado_${chamado.id}`,
      title: `${chamado.id} - ${chamado.assunto} - ${chamado.status} `,
      description: "📌 Deseja consultar detalhes desse chamado",
    })),
    finalizarAtendimento, // Adiciona o novo item ao final do array
  ];
  const options = ListMessageChamadosWpp(rowsListMessage);
  return options;
};
