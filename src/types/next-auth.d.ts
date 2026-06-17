import type { DefaultSession } from "next-auth";

// Surface the operator id on the session (set in the jwt/session callbacks).
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
