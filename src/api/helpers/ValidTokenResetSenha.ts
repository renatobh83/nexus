import { verify } from "jsonwebtoken";
import { AppError } from "../../errors/errors.helper";

export const ValidateTokenResetService = async (
  token: string
): Promise<any> => {
  const forgotSecret = process.env.JWT_SECRET_FORGOT!;
  try {
    const payload = verify(token, forgotSecret);
    return payload;
  } catch (err) {
    throw new AppError("ERR_SESSION_EXPIRED", 403);
  }
};
