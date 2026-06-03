import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string | null;
      memberId?: string | null;
      permissions?: string[];
      jobPosition?: string | null;
      isActive?: boolean | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string | null;
    memberId?: string | null;
    permissions?: string[];
    jobPosition?: string | null;
    isActive?: boolean | null;
  }
}
