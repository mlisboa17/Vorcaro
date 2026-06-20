import type { DefaultSession, User as NextAuthUser } from "next-auth";
import type { JWT as NextAuthJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      tenantId?: string | null;
    };
  }

  interface User extends NextAuthUser {
    tenantId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT {
    tenantId?: string | null;
  }
}
