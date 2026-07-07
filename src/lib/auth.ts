import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { seedCategoryTaxonomyForUser } from "@/lib/categories/seed-category-taxonomy";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "vorcaro-temporary-auth-secret-change-in-vercel",
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: {
    signIn: '/auth/login',
  },
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
        const allowedEmail = (process.env.AUTH_DEV_EMAIL ?? "mlisboa17@gmail.com").toLowerCase().trim();
        const devPassword = process.env.AUTH_DEV_PASSWORD?.trim() || "1234";

        if (normalizedEmail !== allowedEmail || !password) {
          return null;
        }

        const existing = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true, email: true, name: true, tenantId: true },
        });

        if (password !== devPassword) {
          return null;
        }

        if (existing) {
          return { id: existing.id, email: existing.email, name: existing.name, tenantId: existing.tenantId };
        }
        const created = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: normalizedEmail.split("@")[0],
          },
        });

        void seedCategoryTaxonomyForUser(prisma, created.id).catch((error) => {
          console.error("[auth] seedCategoryTaxonomyForUser", error);
        });

        return { id: created.id, email: created.email, name: created.name, tenantId: created.tenantId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        if (user.tenantId) {
          token.tenantId = user.tenantId;
        } else {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { tenantId: true },
          });
          if (dbUser?.tenantId) {
            token.tenantId = dbUser.tenantId;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        if (token.tenantId) {
          session.user.tenantId = token.tenantId;
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (process.env.NODE_ENV === "development") {
        const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
        if (authUrl) {
          try {
            const authUrlObj = new URL(authUrl);
            const baseUrlObj = new URL(baseUrl);
            if (authUrlObj.host !== baseUrlObj.host) {
              console.warn(
                `[NextAuth Dev Warning] Divergencia de dominio detectada: AUTH_URL/NEXTAUTH_URL e '${authUrl}', mas o dominio requisitado e '${baseUrl}'.`
              );
            }
          } catch (e) {
            console.error("[NextAuth Dev Error] Falha ao analisar URLs:", e);
          }
        }
      }
      return url.startsWith("/") ? `${baseUrl}${url}` : url;
    },
  },
});
