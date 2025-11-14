// Definições de DTOs para tipagem
interface CreateWhatsappDTO {
  name: string;
  tenantId: number;
  type?: string;
  tokenHook?: string | null;
  status: string;
  pairingCodeEnabled: boolean;
  tokenTelegram: string;
  wppUser: string;
  isDefault: boolean;
  farewellMessage: string;
  chatFlowId: number;
}

interface UpdateWhatsappDTO {
  type?: string;
  tokenHook?: string | null;
  tenantId: number; // Necessário para gerar o token
  id: number; // Necessário para gerar o token
}
