import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ account, profile, user }) {
      try {
        console.log("[AUTH] signIn callback - START:", {
          provider: account?.provider,
          email: profile?.email,
          sub: account?.providerAccountId,
        });

        if (account?.provider === "google") {
          console.log("[AUTH] Google provider confirmed");
          return true;
        }
        console.log("[AUTH] Non-Google provider, rejecting");
        return false;
      } catch (error) {
        console.error("[AUTH] Error in signIn callback:", error);
        throw error;
      }
    },

    async jwt({ token, user, account }) {
      try {
        console.log("[AUTH] jwt callback - user:", user?.id, "account:", account?.provider);
        if (account?.provider === "google" && account.providerAccountId) {
          token.googleId = account.providerAccountId;
          token.sub = user?.id;
        }
        if (user?.id) {
          token.userId = user.id;
        }
        return token;
      } catch (error) {
        console.error("[AUTH] Error in jwt callback:", error);
        throw error;
      }
    },

    async session({ session, user }) {
      try {
        console.log("[AUTH] session callback - user:", user?.id);
        if (session.user) {
          (session.user as any).id = user.id;
          // googleId is already in user object from DB
          if ((user as any).googleId) {
            (session.user as any).googleId = (user as any).googleId;
          }
        }
        return session;
      } catch (error) {
        console.error("[AUTH] Error in session callback:", error);
        throw error;
      }
    },

    async redirect({ url, baseUrl }) {
      console.log("[AUTH] redirect callback - url:", url, "baseUrl:", baseUrl);
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },

  events: {
    async signIn(message) {
      console.log("[AUTH-EVENT] signIn:", {
        userId: message.user?.id,
        email: message.user?.email,
        isNewUser: message.isNewUser,
      });
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };


