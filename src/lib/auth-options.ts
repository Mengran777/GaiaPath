// src/lib/auth-options.ts
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import prisma from "@/lib/db";
import { comparePassword } from "@/lib/auth";

// Google sign-ups get a username derived from their name. Usernames are unique,
// so two people called "Alex Smith" must not collide (that used to make the
// second sign-in fail). Keeps to the register form's rules: 3–20 chars,
// letters, digits, underscores.
async function uniqueUsername(name: string): Promise<string> {
  let base = name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().slice(0, 16);
  if (base.length < 3) base = "traveller";
  if (!(await prisma.user.findUnique({ where: { username: base } }))) return base;
  for (let i = 0; i < 5; i++) {
    const candidate = `${base}_${Math.floor(100 + Math.random() * 900)}`;
    if (!(await prisma.user.findUnique({ where: { username: candidate } }))) return candidate;
  }
  return `user_${Date.now().toString(36)}`;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
        });
        if (!user) return null;
        const valid = await comparePassword(credentials.password, user.password);
        if (!valid) return null;
        return { id: user.id, name: user.username, email: user.email };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existing = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (!existing) {
          await prisma.user.create({
            data: {
              email: user.email!,
              username: await uniqueUsername(user.name ?? user.email?.split("@")[0] ?? ""),
              password: "google_oauth_no_password",
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
        });
        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string;
      return session;
    },
  },
  session: { strategy: "jwt" as const },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
  },
};
