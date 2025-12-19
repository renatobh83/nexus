import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { handleServerError } from "../../errors/errors.helper";
import { SendRefreshToken } from "../../api/helpers/SendRefreshToken";
import { RefreshTokenService } from "../../api/helpers/RefreshTokenService";
import { ValidateTokenResetService } from "../../api/helpers/ValidTokenResetSenha";


const isDevelopment = process.env.NODE_ENV === 'development';
export async function authController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const authService = fastify.services.authService;

  fastify.post(
    "/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          email: string;
          password: string;
          name: string;
          profile: string;
          queues: number[];
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { email, password } = request.body as any;
        const user = await authService.login(email, password);

        const accessToken = request.server.jwt.sign(user, { expiresIn: "3d" });
        const refreshToken = request.server.jwt.sign(user, { expiresIn: "7d" });

        SendRefreshToken(reply, refreshToken);

        reply.setCookie("access_token", accessToken, {
          httpOnly: true,
          secure: !isDevelopment,
          sameSite: "strict",
          path: "/",
        });
        return reply.code(200).send(user);

      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.get("/csrf", async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      csrfToken: reply.generateCsrf(),
    };
  });
  fastify.get("/me", { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {

      return reply.code(200).send(request.user);
    } catch (error) {
      return handleServerError(reply, error);
    }
  });
  fastify.post(
    "/logout",
    {
      schema: {
        body: {
          type: "object",
          required: ["userId"],
          properties: {
            userId: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.body as any;
      try {
        await authService.logout(userId);
        const AUTH_COOKIES = [
          "access_token",
          "refreshToken",
          "_csrf",
        ];
        AUTH_COOKIES.forEach((cookie) => {
          reply.clearCookie(cookie, {
            path: "/",
            sameSite: "strict",
          });
        });

        return reply.send({ message: "Logout realizado com sucesso" });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/forgot-password",
    {
      schema: {
        body: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email } = request.body as any;
      if (!email) {
        return reply.code(400).send({ mesaage: "email nao informado" });
      }

      try {
        await authService.forgotPassword(email);
        return reply
          .code(200)
          .send({ message: "E-mail enviado com link de redefinição" });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/valid_token",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
        return reply.code(200).send({ valid: true });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/refresh_token",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const refreshToken = request.cookies.refreshToken;
        if (!refreshToken) {
          return reply.status(401).send();
        }

        const payload = fastify.jwt.verify(refreshToken);
        const newAccessToken = fastify.jwt.sign(payload);
        reply.setCookie("access_token", newAccessToken, {
          httpOnly: true,
          sameSite: "lax",
          secure: true,
          path: "/",
        });

        return { success: true };
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/reset-password",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token, newPassword } = request.body as any;
      try {
        const payload = await ValidateTokenResetService(token);

        const email = await authService.UpdatePassword(payload, newPassword);
        reply.code(200).send({ email, password: newPassword });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}
