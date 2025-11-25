import { redisClient } from "../../lib/redis";
import { logger } from "../../ultis/logger";

export class TokenService {
  private readonly TOKEN_PREFIX = "registration_token:";
  private readonly TOKEN_EXPIRATION = 15 * 60; // 15 minutos

  // Gerar e armazenar token no Redis
  async generateRegistrationToken(userId: string): Promise<string> {
    const token = this.generateRandomToken();
    const tokenKey = this.TOKEN_PREFIX + token;

    try {
      // Armazena o token com userId como valor e expiração
      await redisClient.setex(
        tokenKey,
        this.TOKEN_EXPIRATION,
        JSON.stringify({
          userId,
          used: false,
          createdAt: new Date().toISOString(),
        })
      );

      logger.info(`Token gerado para usuário ${userId}: ${token}`);
      return token;
    } catch (error) {
      logger.error(`Erro ao gerar token: ${error}`);
      throw new Error("Falha ao gerar token de registro");
    }
  }

  // Validar token (sem marcar como usado)
  async validateToken(token: string): Promise<{ valid: boolean; data?: any }> {
    const tokenKey = this.TOKEN_PREFIX + token;

    try {
      const tokenData = await redisClient.get(tokenKey);

      if (!tokenData) {
        logger.warn(`Token não encontrado ou expirado: ${token}`);
        return { valid: false };
      }

      const parsedData = JSON.parse(tokenData);

      if (parsedData.used) {
        logger.warn(`Token já utilizado: ${token}`);
        return { valid: false };
      }

      logger.info(`Token válido encontrado: ${token}`);
      return { valid: true, data: parsedData };
    } catch (error) {
      logger.error(`Erro ao validar token ${token}: ${error}`);
      return { valid: false };
    }
  }

  // Marcar token como usado (atomicamente)
  async markTokenAsUsed(token: string): Promise<boolean> {
    const tokenKey = this.TOKEN_PREFIX + token;

    try {
      // Usando WATCH/MULTI/EXEC para operação atômica
      await redisClient.watch(tokenKey);

      const tokenData = await redisClient.get(tokenKey);

      if (!tokenData) {
        await redisClient.unwatch();
        logger.warn(`Token não existe ao tentar marcar como usado: ${token}`);
        return false;
      }

      const parsedData = JSON.parse(tokenData);

      if (parsedData.used) {
        await redisClient.unwatch();
        logger.warn(`Token já estava marcado como usado: ${token}`);
        return false;
      }

      // Atualiza atomicamente
      const multi = redisClient.multi();
      multi.setex(
        tokenKey,
        this.TOKEN_EXPIRATION,
        JSON.stringify({
          ...parsedData,
          used: true,
          usedAt: new Date().toISOString(),
        })
      );

      const results = await multi.exec();

      if (results === null) {
        logger.warn(`Operação atômica falhou para token: ${token}`);
        return false;
      }

      logger.info(`Token marcado como usado: ${token}`);
      return true;
    } catch (error) {
      logger.error(`Erro ao marcar token como usado ${token}: ${error}`);
      return false;
    }
  }

  // Limpar token (opcional)
  async invalidateToken(token: string): Promise<void> {
    const tokenKey = this.TOKEN_PREFIX + token;
    try {
      await redisClient.del(tokenKey);
      logger.info(`Token invalidado: ${token}`);
    } catch (error) {
      logger.error(`Erro ao invalidar token ${token}: ${error}`);
    }
  }

  private generateRandomToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
