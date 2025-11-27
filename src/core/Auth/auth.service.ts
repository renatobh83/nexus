import { Prisma } from "@prisma/client";
import { UsersRepository } from "../Users/users.repository";
import { compare, hash } from "bcryptjs";
import { AppError } from "../../errors/errors.helper";
import { getIO } from "../../lib/socket";

import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import { redisClient } from "../../lib/redis";
import { profile } from "console";

export class AuthService {
  private userRepository: UsersRepository;

  constructor() {
    this.userRepository = new UsersRepository();
  }

  async login(email: string, password: string) {
    const where: Prisma.UserWhereInput = { email };
    const user = await this.userRepository.findUserById(where);
    if (!user) {
      throw new AppError("ERR_USER_NOT_FOUND", 404);
    }
    const isPasswordValid = await compare(password, user.passwordHash!);
    if (!isPasswordValid) {
      throw new AppError("ERR_INVALID_CREDENTIALS", 401);
    }
    const payload = {
      name: user.name,
      email: user.email,
      username: user.name,
      tenantId: user.tenantId,
      profile: user.profile,
      userId: user.id,
      configs: user.configs,
      status: user.status,
    };
    await this.userRepository.updateStatus(user.id, user.tenantId, {
      isOnline: true,
      status: "online",
      lastLogin: new Date(),
    });
    const io = getIO();
    io.emit(`${user.tenantId}:users`, {
      action: "update",
      data: {
        username: user.name,
        email,
        isOnline: true,
        lastLogin: new Date(),
        lastOnline: new Date(),
      },
    });
    return payload;
  }

  async findUsersOnline(tenantid?: number) {
    const where: Prisma.UserWhereInput = {
      isOnline: true,
      ativo: true,
    };
    return this.userRepository.findUserOnline(where);
  }
  async logout(userId: string) {
    const id = parseInt(userId);
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError("ERR_USER_NOT_FOUND", 404);
    }
    await this.userRepository.updateStatus(user.id, user.tenantId, {
      isOnline: false,
      status: "offline",
      lastLogout: new Date(),
    });
    const io = getIO();
    io.emit(`${user.tenantId}:users`, {
      action: "update",
      data: {
        username: user.name,
        email: user.email,
        isOnline: false,
        lastLogout: new Date(),
      },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findFirst({ email: email });
    if (!user) {
      throw new AppError("ERR_USER_NOT_FOUND", 404);
    }
    const resetToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET_FORGOT!,
      {
        expiresIn: "15m",
      }
    );

    const fullUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    //   // Encurta com Redis
    const code = nanoid(6);
    const expireSeconds = 15 * 60;

    await redisClient.setex(`short:${code}`, expireSeconds, fullUrl);

    const shortUrl = `${process.env.BACKEND_URL}/aux/r/${code}`;
    console.log(shortUrl);
    //   await SendEmailServices({
    //     tenantId: user.tenantId,
    //     to: user.email,
    //     subject: "Recuperação de senha",
    //     html: `<p>Você solicitou a recuperação de senha. Clique abaixo para redefinir:</p>
    //            <a href="${shortUrl}">Redefinir Senha</a>
    //            <p>Este link expira em 15 minutos.</p>`,
    //     isForgot: true,
    //   });
  }
  async UpdatePassword(user: any, newPassword: string) {
    const userFind = await this.userRepository.findById(user.id);
    if (!userFind) {
      throw new AppError("ERR_USER_NOT_FOUND", 404);
    }
    userFind.passwordHash = await hash(newPassword, 8);
    await this.userRepository.createOrUpdateUser(userFind);
    return userFind.email;
  }
}
