import { FastifyReply } from "fastify";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const ERRORS = {
  invalidToken: new AppError("Token is invalid.", 401),
  userExists: new AppError("User already exists", 409),
  userNotExists: new AppError("ERR_USER_NOT_FOUND", 404),
  userCredError: new AppError("ERR_INVALID_CREDENTIALS", 401),
  tokenError: new AppError("Invalid Token", 401),
  invalidRequest: new AppError("Invalid Token", 400),
  internalServerError: new AppError("Internal Server Error", 500),
  unauthorizedAccess: new AppError("Unauthorized access", 401),
  UnprocessableEntity: new AppError("ERRO_VALIDATION", 422),
  EmpresaNoFound: new AppError("ERR_NO_TENANT_FOUND", 404),
  MessageNoFound: new AppError("ERR_NO_MESSAGE_INFORMATION", 404),
};

export function handleServerError(reply: FastifyReply, error: any) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ message: error.message });
  }

  return reply.status(ERRORS.internalServerError.statusCode).send(error);
}
