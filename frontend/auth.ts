import NextAuth from "next-auth";
import { DefaultSession } from "next-auth";
import Discord from "next-auth/providers/discord";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      authorization: "https://discord.com/api/oauth2/authorize?scope=identify+email+guilds",
    }),
  ],
  callbacks: {
    async jwt({ token, account, user, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.id = profile?.id;
        token.email = profile?.email;
        token.profile = profile;
        token.guilds = await fetch("https://discord.com/api/v6/users/@me/guilds", {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
          },
        }).then((res) => res.json());
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        name: token.name,
        email: token.email ?? "",
        id: token.id as string,
        image: token.picture,
        emailVerified: null,
        guilds: token.guilds,
      };
      return session;
    },
    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      guilds: any;
    } & DefaultSession["user"];
  }
  
  interface User {
    guilds?: any;
  }
}
