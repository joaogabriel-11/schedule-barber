import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { checkLoginRateLimit, recordFailedLoginAttempt, resetLoginAttempts } from "./login-rate-limit";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email e senha são obrigatórios");
        }

        // Check rate limit
        const rateLimitCheck = await checkLoginRateLimit(credentials.email);
        
        if (!rateLimitCheck.allowed) {
          throw new Error(rateLimitCheck.error);
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email }
        });

        if (!usuario) {
          await recordFailedLoginAttempt(credentials.email);
          throw new Error("Credenciais inválidas");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          usuario.senha
        );

        if (!isPasswordValid) {
          await recordFailedLoginAttempt(credentials.email);
          throw new Error("Credenciais inválidas");
        }

        // Reset login attempts on successful login
        await resetLoginAttempts(credentials.email);

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nome,
          role: usuario.role
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false
      }
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false
      }
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false
      }
    }
  }
};
