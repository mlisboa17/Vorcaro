import { randomBytes } from "crypto";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateConnectCode(length = 6): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARSET[bytes[i]! % CHARSET.length];
  }
  return code;
}

export const CONNECT_CODE_TTL_MS = 15 * 60 * 1000;
