import { prisma } from "../../lib/prisma";
import { RelatorioData } from "./statistics.types";
import { msToHms } from "./statistics.utils";

export class StatistiscRepository {
  async gerarRelatorioComPrisma(dataPesquisa: string) {
    // Use strings UTC para consistência, como discutimos
    const dataPesquisaObj = new Date(dataPesquisa);
    const primeiroDiaMes = new Date(
      dataPesquisaObj.getFullYear(),
      dataPesquisaObj.getMonth(),
      1
    );

    // A consulta será feita em duas etapas:
    // 1. Agregação com $queryRaw para máxima flexibilidade.
    // 2. Busca dos nomes das empresas para juntar os dados.

    // As variáveis 'a' e 'b' para o SQL precisam ser formatadas como strings
    const a = primeiroDiaMes.toISOString();
    const b = dataPesquisaObj.toISOString();

    // Usando $queryRaw para replicar a lógica exata do Sequelize
    const relatorioAgregado: any[] = await prisma.$queryRaw`
    SELECT
      c."empresaId",
      COUNT(c.id) AS "total_chamados",

      -- Contar chamados abertos (ainda sem data de fechamento)
      COUNT(CASE WHEN c."closedAt" IS NULL THEN 1 END) AS "chamados_abertos",

      -- Contar chamados fechados no período
      COUNT(CASE WHEN c."closedAt" BETWEEN ${a}::timestamp AND ${b}::timestamp THEN 1 END) AS "chamados_fechados",

      -- Contar chamados transferidos (abertos no período, fechados fora)
      COUNT(CASE WHEN c."createdAt" BETWEEN ${a}::timestamp AND ${b}::timestamp AND c."closedAt" IS NOT NULL AND c."closedAt" NOT BETWEEN ${a}::timestamp AND ${b}::timestamp THEN 1 END) AS "chamados_transferidos",

      -- Somar tempo dos chamados fechados no período
      COALESCE(SUM(CASE WHEN c."closedAt" BETWEEN ${a}::timestamp AND ${b}::timestamp THEN c."tempoChamado" ELSE 0 END), 0) AS "tempo_total_horas"

    FROM "Chamados" AS c
    WHERE
      -- Filtro principal: abertos OU fechados no período
      (c."createdAt" BETWEEN ${a}::timestamp AND ${b}::timestamp)
      OR
      (c."closedAt" BETWEEN ${a}::timestamp AND ${b}::timestamp)
    GROUP BY c."empresaId";
  `;

    // Passo 2: Buscar os nomes das empresas
    const empresaIds = relatorioAgregado.map((item) => item.empresaId);
    const empresas = await prisma.empresa.findMany({
      where: {
        id: { in: empresaIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Mapear nomes para um lookup fácil
    const empresaMap = new Map(empresas.map((e) => [e.id, e.name]));

    // Passo 3: Juntar os resultados
    const relatorioFinal = relatorioAgregado.map((item) => ({
      ...item,
      total_chamados: Number(item.total_chamados), // Converter BigInt para Number
      chamados_abertos: Number(item.chamados_abertos),
      chamados_fechados: Number(item.chamados_fechados),
      chamados_transferidos: Number(item.chamados_transferidos),
      tempo_total_horas: Number(item.tempo_total_horas),
      empresa: empresaMap.get(item.empresaId) || "Empresa não encontrada",
    }));

    return relatorioFinal;
  }
  async getLatestContract(empresaId: number) {
    const contrato = await prisma.empresaContrato.findFirst({
      where: {
        empresaId: empresaId,
      },
      orderBy: {
        dataContrato: "desc", // Pega o mais recente
      },
      select: {
        id: true,
        dataContrato: true,
        totalHoras: true,
      },
    });
    return contrato;
  }
  async calculateTotalTime(
    empresaId: number,
    primeiroDiaMes: string,
    dataPesquisaObj: string
  ) {
    const result = await prisma.$queryRaw<{ tempo_total_horas: bigint }[]>`
    SELECT
      COALESCE(SUM(
        CASE
          -- A lógica original do Sequelize era mais complexa, mas esta simplifica para o período
          WHEN c."closedAt" BETWEEN ${primeiroDiaMes}::timestamp AND ${dataPesquisaObj}::timestamp
          THEN c."tempoChamado"
          ELSE 0
        END
      ), 0) AS "tempo_total_horas"
    FROM "Chamados" AS c
    WHERE c."empresaId" = ${empresaId};
  `;

    // Retorna o valor como Number (ou BigInt, dependendo da necessidade)
    return result[0] ? Number(result[0].tempo_total_horas) : 0;
  }
  async generateAndDownloadPDF(
    empresaId: number,
    period: string
  ): Promise<RelatorioData | []> {
    // 1. Preparação das Datas (em UTC para consistência)
    const dataPesquisaDate = new Date(period);
    const primeiroDiaMesDate = new Date(
      dataPesquisaDate.getFullYear(),
      dataPesquisaDate.getMonth(),
      1
    );

    // Formato ISO 8601 (UTC) para filtros do Prisma
    const primeiroDiaMes = primeiroDiaMesDate.toISOString();
    const dataPesquisaObj = dataPesquisaDate.toISOString();

    // 2. Consulta Principal: Buscar os Chamados Individuais
    // O filtro é: Chamados fechados no período, abertos antes OU durante o período.
    const chamados = await prisma.chamado.findMany({
      where: {
        empresaId: empresaId,
        closedAt: {
          gte: primeiroDiaMes, // Fechado a partir do primeiro dia do mês
          lte: dataPesquisaObj, // Fechado até a data de pesquisa
        },
        // A lógica OR do Sequelize (aberto antes OU durante) é traduzida para:
        // O campo createdAt deve ser menor ou igual à data de pesquisa.
        // O filtro original era: (createdAt BETWEEN [a, b]) OR (createdAt < a)
        // Que simplifica para: createdAt <= b (se b for o fim do período)
        createdAt: {
          lte: dataPesquisaObj,
        },
      },
      // Inclui a Empresa (JOIN)
      include: {
        empresa: {
          select: {
            name: true,
            address: true,
            identifier: true,
            // Não incluímos o contrato aqui, pois ele precisa de uma subquery
          },
        },
      },
      orderBy: {
        createdAt: "asc", // Exemplo de ordenação
      },
    });

    // 3. Agregação e Busca de Contrato (Pós-processamento)
    if (chamados.length === 0) {
      console.log("Nenhum chamado encontrado para esse período.");
      return [];
    }

    // 3.1. Buscar o Contrato Mais Recente
    const contrato = await this.getLatestContract(empresaId);

    // 3.2. Calcular o Tempo Total (usando a função $queryRaw)
    const tempoTotalChamados = await this.calculateTotalTime(
      empresaId,
      primeiroDiaMes,
      dataPesquisaObj
    );

    // 4. Estruturar o Resultado para a Geração do PDF
    // O resultado do Prisma é mais limpo e tipado.
    const dadosEmpresa = chamados[0].empresa;
    const totalHorasContrato = contrato?.totalHoras || 0;
    const totalHorasContratoMs = totalHorasContrato * 60 * 60 * 1000; // horas → ms
    const excedenteMs = tempoTotalChamados - totalHorasContratoMs;
    const horasExcedentesFormatadas = msToHms(excedenteMs);
    // A lógica de formatação de tempo e cálculo de excedente (msToHms)
    // deve ser mantida no Node.js, como já estava.

    // O resultado final é uma estrutura de dados pronta para o gerador de PDF
    const relatorioData: RelatorioData = {
      chamados: chamados,
      dadosEmpresa: {
        name: dadosEmpresa.name,
        cpnj: dadosEmpresa.identifier,
      },
      dadosContrato: {
        horasUtilizadas: tempoTotalChamados,
        horasContratadas: totalHorasContrato,
        horasExcedentes: excedenteMs > 0 ? horasExcedentesFormatadas : "0:00",
        excedeu: excedenteMs > 0,
      },
    };

    return relatorioData;
  }

  async findTicketsQueues() {}
}
