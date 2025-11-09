import { JWTPayload, SignJWT, jwtVerify } from "jose";

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable.");
  }

  return new TextEncoder().encode(secret);
};

export const signJwt = async (
  payload: JWTPayload,
  expiresIn: string | number = "7d"
) => {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey());
};

export const verifyJwt = async <T extends JWTPayload>(token: string) => {
  const { payload } = await jwtVerify(token, getSecretKey());
  return payload as T;
};
