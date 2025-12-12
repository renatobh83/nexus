export type SessaoUsuario = {
  dadosPaciente: any;
  unidadeSelecionada: any;
  planoSelecionado: any;
  examesParaAgendar: any[];
  ultimaDataConsulta: any;
  horarioSelecionado: any;
  cadastro: any;
  cdHorario: any;
  intervaloSelecionado: string;
  medicosSelecionados: any;
  ultimoExameSelecionado: any;
  errosResponse: number;
  // Adicionados
  listaAtendimentos: ResponseListaAtendimento[];
  listaAgendamentos: ResponseListaAgendamentos[];
  listaPlanos: ResponseListaPlanos[];
  listaUnidades: any[];
  listaExames: any[];
  valorTotalExames: number;
  examesComMedicos: {
    cd_procedimento: string;
    medicos: any[];
  }[];
};

export interface ResponseListaAtendimento {
  ds_medico: string;
  dt_data: string;
  ds_procedimento: string;
  cd_exame: string;
}

export interface ResponseListaPlanos {
  cd_plano: number;
  ds_plano: string;
  cd_fornecedor: number;
  ds_fornecedor: string;
}
export interface ResponseListaAgendamentos {
  cd_atendimento: number;
  ds_status: string;
  cd_paciente: number;
  ds_paciente: string;
  ds_paciente_social: null;
  dt_data: string;
  dt_hora_chegada: string;
  dt_hora: string;
  ds_empresa: string;
  cd_procedimento: string;
  cd_modalidade: number;
  ds_modalidade: string;
}
export interface InlineButton {
  text: string;
  callback_data: string;
}
