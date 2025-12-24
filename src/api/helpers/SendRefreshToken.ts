import { FastifyReply } from "fastify/types/reply";

export const SendRefreshToken = (reply: FastifyReply, token: string): void => {
  reply.setCookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "production",
    sameSite: process.env.NODE_ENV !== "production" ? "lax" : "strict",
    path: "/",
    maxAge: 3600,
  });
};
