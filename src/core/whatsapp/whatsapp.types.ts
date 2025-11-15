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
  tokenHook?: string | null;
  tenantId?: number; // Necessário para gerar o token
  id?: number; // Necessário para gerar o token
  name?: string;
  status?: string;
  session?: string;
  isDefault?: boolean;
  tokenTelegram?: string;
  pairingCodeEnabled?: boolean;
  farewellMessage?: string;
  isActive?: boolean;
  type?: "waba" | "instagram" | "telegram" | "whatsapp" | "messenger";
  wabaBSP?: string;
  tokenAPI?: string;
  chatFlowId?: number | null;
  wppUser?: string;
  qrcode?: string | null;
  retries?: number;
  phone?: string;
  pairingCode?: string | null
}
