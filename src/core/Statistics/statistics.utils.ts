import PDFDocument from "pdfkit";
import fs from "fs";
export const formatador = new Intl.DateTimeFormat("pt-BR");

type PDFDoc = InstanceType<typeof PDFDocument>;

export function generatePDF(
  company: { name: any; cpnj: any },
  period: any,
  calls: any[],
  dataReport: Date,
  resumoRelatorio: any
) {
  const doc = new PDFDocument({ margin: 20, autoFirstPage: true }); // Margens reduzidas

  const stream = fs.createWriteStream(`public/relatorio-${company.name}.pdf`);
  doc.pipe(stream);

  let callsPerPage = 30; // Como temos menos margem, cabe mais registros
  let totalPages = Math.ceil(calls.length / callsPerPage) || 1;
  let currentPage = 1;
  let currentIndex = 0;

  // Cabeçalho Melhorado
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(company.name, { align: "center" })
    .fontSize(9)
    .font("Helvetica")
    .text(`CNPJ: ${company.cpnj}`, { align: "center" })
    .text(`Relatório do Período: ${period}`, { align: "center" })
    .moveDown(0.5);

  // Criar tabela de chamados com formatação
  doc.fontSize(10).text("Chamados:", { underline: true }).moveDown(0.3);

  const columnWidths = [80, 60, 160, 200, 20]; // Ajuste das colunas para caber melhor
  const startX = 20;
  let startY = doc.y;

  // Cabeçalho da Tabela
  doc
    .font("Helvetica-Bold")
    .text("Data", startX, startY)
    .text("Chamado", startX + columnWidths[0]!, startY)
    .text("Assunto", startX + columnWidths[0]! + columnWidths[1]!, startY)
    .text(
      "Conclusão",
      startX + columnWidths[0]! + columnWidths[1]! + columnWidths[2]!,
      startY
    )
    .text(
      "Tempo",
      startX +
        columnWidths[0]! +
        columnWidths[1]! +
        columnWidths[2]! +
        columnWidths[3]!,
      startY
    )
    .moveDown(0.3);

  doc.font("Helvetica");

  calls.forEach((call, index) => {
    startY = doc.y;

    doc
      .text(formatador.format(new Date(call.createdAt)), startX, startY)
      .text(call.id.toString(), startX + columnWidths[0]!, startY)
      .text(
        call.assunto,
        startX + columnWidths[0]! + columnWidths[1]!,
        startY,
        { width: columnWidths[2] }
      )
      .text(
        call.conclusao.slice(0, 30),
        startX + columnWidths[0]! + columnWidths[1]! + columnWidths[2]!,
        startY,
        { width: columnWidths[3] }
      )
      .text(
        formatarTempo(call.tempoChamado),
        startX +
          columnWidths[0]! +
          columnWidths[1]! +
          columnWidths[2]! +
          columnWidths[3]!,
        startY
      )
      .moveDown(0.3);

    currentIndex++;

    // Criar nova página quando atingimos o limite de registros por página
    if (currentIndex % callsPerPage === 0 && index !== calls.length - 1) {
      adicionarRodape(doc, currentPage, totalPages);
      doc.addPage();
      currentPage++;
    }
  });
  const formatado = `

    Horas Utilizadas: ${formatarTempo(resumoRelatorio.horasUtilizadas)}
    Horas Contratadas: ${resumoRelatorio.horasContratadas}
    Horas Excedentes: ${resumoRelatorio.horasExcedentes}
    Excedeu o Limite? ${resumoRelatorio.excedeu ? "Sim" : "Não"}
    `;
  doc.text(formatado, startX);
  // Adiciona o rodapé na última página
  adicionarRodape(doc, currentPage, totalPages, true, dataReport);

  // Adicionando borda ao redor do conteúdo com margens menores
  let wi = doc.page.width;
  let hi = doc.page.height;
  doc.rect(3, 3, wi - 6, hi - 6).stroke(); // Ajustado para bordas menores

  // Finaliza o PDF
  doc.end();
}

// Função para formatar tempo
const formatarTempo = (ms: number): string => {
  const segundos = Math.floor((ms / 1000) % 60);
  const minutos = Math.floor((ms / (1000 * 60)) % 60);
  const horas = Math.floor(ms / (1000 * 60 * 60));
  return `${horas}h ${minutos}m ${segundos}s`;
};

// Função para adicionar o rodapé corretamente
function adicionarRodape(
  doc: PDFDoc,
  currentPage: number,
  totalPages: number,
  isLastPage = false,
  data?: Date
) {
  const rightMargin = 80;
  const bottomMargin = 25; // Reduzido

  const yPosition = isLastPage ? doc.y + 15 : doc.page.height - bottomMargin;

  doc
    .fontSize(9)
    .text(
      `Página ${currentPage} de ${totalPages}`,
      doc.page.width - rightMargin,
      yPosition,
      { align: "right" }
    )
    .fontSize(7)
    .text(`Gerado em: ${getDataHoraFormatada(data)}`, 20, yPosition);
}

function getDataHoraFormatada(data: any) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(data)); // <- novo Date a cada chamada
}

export function msToHms(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const remainingSeconds = seconds % 60;
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
}
