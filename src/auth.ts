import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { authConfig } from "./auth.config";
import { clientPromise, getDb } from "./lib/mongodb";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Shared identity collections with the team site (NOT prefixed with docs_).
  adapter: MongoDBAdapter(clientPromise, {
    collections: {
      Users: "users",
      Accounts: "accounts",
      Sessions: "sessions",
      VerificationTokens: "verification_tokens",
    },
  }),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // Runs in Node on initial sign-in (user present) — enrich from members.
      if (user) {
        token.picture = user.image ?? token.picture;
        try {
          const db = await getDb();
          const member = await db
            .collection("members")
            .findOne({ email: token.email });
          if (member) {
            token.memberId = member._id?.toString();
            token.role = member.role ?? null;
            token.permissions = member.permissions ?? [];
            token.jobPosition = member.jobPosition ?? null;
            token.isActive = member.isActive ?? null;
            const fullName = [member.firstName, member.middleName, member.lastName]
              .filter(Boolean)
              .join(" ")
              .trim();
            if (fullName) token.name = fullName;
          }
        } catch (e) {
          console.error("jwt member enrich failed", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = (token.role as string) ?? null;
        session.user.memberId = (token.memberId as string) ?? null;
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.jobPosition = (token.jobPosition as string) ?? null;
        session.user.isActive = (token.isActive as boolean) ?? null;
      }
      return session;
    },
  },
});
