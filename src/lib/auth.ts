import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase().trim();
        const devPassword = process.env.AUTH_DEV_PASSWORD;

        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (existing?.passwordHash) {
          if (!password || !verifyPassword(password, existing.passwordHash)) {
            return null;
          }
          return existing;
        }

        if (existing && devPassword) {
          if (password !== devPassword) return null;
          return existing;
        }

        if (existing) {
          return existing;
        }

        if (devPassword && password !== devPassword) {
          return null;
        }

        return prisma.user.create({
          data: {
            email: normalizedEmail,
            name: normalizedEmail.split("@")[0],
          },
        });
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
