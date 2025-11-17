import { FastifyRequest } from "fastify";

export const RefreshTokenService = async (
  request: FastifyRequest
): Promise<string> => {
  const decoded = await request.jwtVerify();

  const refreshToken = request.server.jwt.sign(decoded, { expiresIn: "3d" });

  return refreshToken;
};
