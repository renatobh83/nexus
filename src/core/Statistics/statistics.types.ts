import { Prisma } from "@prisma/client";

interface DadosContrato {
  horasUtilizadas: number; // Resultado do calculateTotalTime
  horasContratadas: number; // Resultado do getLatestContract
  horasExcedentes: string;
  excedeu: boolean;
}
type ChamadoComEmpresa = Prisma.ChamadoGetPayload<{
  include: {
    empresa: {
      select: {
        name: true;
        address: true;
        identifier: true;
      };
    };
  };
}>;
export interface RelatorioData {
  chamados: ChamadoComEmpresa[];
  dadosEmpresa: {
    name: string;
    cpnj: null | bigint;
  };
  dadosContrato: DadosContrato;
}
