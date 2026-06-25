import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { seedCategoryTaxonomyForUser } from "@/lib/categories/seed-category-taxonomy";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: {
    signIn: '/auth/login',
  },
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
    }),
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

        const created = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: normalizedEmail.split("@")[0],
          },
        });

        void seedCategoryTaxonomyForUser(prisma, created.id).catch((error) => {
          console.error("[auth] seedCategoryTaxonomyForUser", error);
        });

        return created;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // Idempotency lock: check if this user already has a tenant linked
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { tenantId: true, name: true, email: true },
        });

        if (dbUser && !dbUser.tenantId) {
          const tenantName = `Holding corporativa de ${dbUser.name || user.name || dbUser.email.split("@")[0]}`;
          
          await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
              data: { name: tenantName },
            });
            await tx.user.update({
              where: { id: user.id },
              data: { tenantId: tenant.id },
            });
            // Update the user reference object in-memory so subsequent callbacks (jwt) receive the tenantId
            user.tenantId = tenant.id;
          });
        } else if (dbUser?.tenantId) {
          user.tenantId = dbUser.tenantId;
        }
      }
      return true;
    },
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
                `[NextAuth Dev Warning] Divergência de domínio detectada: AUTH_URL/NEXTAUTH_URL é '${authUrl}', mas o domínio requisitado é '${baseUrl}'.`
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
