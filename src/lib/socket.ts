import { Server as SocketIOServer, Socket } from "socket.io";
import { logger } from "../ultis/logger";
import { HandleMessageChatClient } from "../api/helpers/WebChat/HandleMessageChatClient";
// import { HandleMessageChatClient } from "../services/ChatClientService/HandleMessageChatClient";

// 1. A variável `io` continua a existir para ser acessada por outras partes da aplicação através do `getIO`.
let io: SocketIOServer | null = null;

// 2. A função `getIO` permanece a mesma, garantindo que a instância do Socket.IO esteja disponível.
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error(
      "Socket.IO não foi inicializado! A instância deve ser definida na função setupSocket."
    );
  }
  return io;
};

// 3. A função `initSocket` foi removida. A inicialização agora é feita pelo plugin `fastify-socket.io`.

// 4. A função `setupSocket` agora recebe a instância do `io` do Fastify e configura os listeners.
// O middleware de autenticação foi movido para o arquivo principal do servidor (onde o plugin é registrado).
export const setupSocket = (ioInstance: SocketIOServer): void => {
  // Inicializa a variável global `io` para que o `getIO` funcione.
  io = ioInstance;

  // A lógica de conexão permanece aqui.
  io.on("connection", async (socket: Socket) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      const { tenantId, type } = socket.handshake.auth;

      // A lógica de autenticação já foi executada no middleware, então os dados estão em `socket.handshake.auth`.
      if (type === "chat-client") {
        await HandleMessageChatClient(socket);
        return;
      }

      if (!token) {
        console.warn(`Socket ${socket.id} tentou conectar sem token`);
        socket.disconnect(true);
        return;
      }

      if (tenantId) {
        socket.join(tenantId.toString());
        logger.info(
          `Cliente ${socket.id} entrou na sala do tenant ${tenantId}`
        );
      }
    } catch (err) {
      // O erro de token inválido deve ser tratado no middleware, mas mantemos o tratamento de erro geral
      // para garantir que o socket seja desconectado em caso de falha inesperada.
      logger.error(`Erro inesperado no socket ${socket.id}:`, err);
      socket.disconnect(true); // Garante que não fique conectado
    }

    socket.on("disconnect", (reason) => {
      console.log(`Cliente desconectado: ${socket.id}, Motivo: ${reason}`);
    });
  });
};
