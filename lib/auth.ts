import { JWTPayload } from "jose";
import { hash, compare } from "bcryptjs";
import { signJwt, verifyJwt } from "./jwt";

export type UserRole = "super_admin" | "staff" | "corporate";

export interface AuthTokenPayload extends JWTPayload {
  sub: string;
  role: UserRole;
}

const resolvedSaltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const SALT_ROUNDS = Number.isNaN(resolvedSaltRounds) ? 12 : resolvedSaltRounds;

export const generateJWT = async (userId: string, role: UserRole) => {
  return signJwt({ sub: userId, role });
};

export const verifyJWT = async (token: string) => {
  return verifyJwt<AuthTokenPayload>(token);
};

export const hashPassword = async (password: string) => {
  return hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, passwordHash: string) => {
  return compare(password, passwordHash);
};
