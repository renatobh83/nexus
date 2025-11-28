import { Chamado } from "@prisma/client";

function _trransformSingleChamado(chamado: any) {
  const { chamadoContatos, ...restChamado } = chamado;

  const dadoContato = chamado.chamadoContatos.map(
    (item: { contact: any }) => item.contact
  );
  return {
    ...(restChamado as Chamado),
    contatos: dadoContato,
  };
}
// Função principal flexível
export function transformChamados(chamados: any) {
  // Verifica se a entrada é um array
  if (Array.isArray(chamados)) {
    // Se for um array, mapeia e aplica a transformação em cada item
    return chamados.map(_trransformSingleChamado);
  }

  // Se for um objeto único, aplica a transformação diretamente
  return _trransformSingleChamado(chamados);
}
