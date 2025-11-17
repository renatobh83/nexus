import { FastifyReply } from "fastify/types/reply";

export const SendRefreshToken = (reply: FastifyReply, token: string): void => {
  reply.setCookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "prod",
    sameSite: process.env.NODE_ENV !== "prod" ? "lax" : "strict",
    path: "/",
    maxAge: 3600,
  });
};
