import { verify } from "jsonwebtoken";
import { logger } from "./logger";


interface TokenPayload {
  id: string;
  username?: string;
  name?: string;
  email?: string;
  empresa?: string;
  profile: string;
  empresaId?: string;
  tenantId: number;
  iat: number;
  exp: number;
  type?: string;
}

interface Data {
  id?: number | string;
  profile?: string;
  tenantId: number | string;
  empresa?: string;
  email?: string;
  name?: string;
  type?: string;
  empresaId?: string;
}
interface Result {
  isValid: boolean;
  data: Data;
}

const decode = (token: string): Result => {
  const validation: Result = {
    isValid: false,
    data: {
      id: "",
      profile: "",
      tenantId: 0,
    },
  };

  const secrets = [process.env.CHAT_SECRET!, process.env.JWT_SECRET!];

  for (const secret of secrets) {
    try {
      const decoded = verify(token, secret) as TokenPayload;

      validation.isValid = true;
      if (decoded.type === "chat-client") {
        validation.data = {
          empresaId: decoded.empresaId,
          empresa: decoded.empresa,
          email: decoded.email,
          name: decoded.name,
          tenantId: decoded.tenantId,
          type: decoded.type,
        };
      } else {
        validation.data = {
          id: decoded.id,
          profile: decoded.profile,
          tenantId: decoded.tenantId,
        };
      }
      break; // Sucesso: não precisa tentar mais
    } catch (err) {
      // Ignora e tenta a próxima chave
      continue;
    }
  }

  if (!validation.isValid) {
    logger.error("Falha na verificação do token em todas as chaves.");
  }

  return validation;
};

export default decode;
