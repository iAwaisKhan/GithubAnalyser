import { PLAN_LIMITS } from "./plans";
export { PLAN_LIMITS };
import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { pool, runMigrations } from "@/lib/db";

// Extend session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      plan: "free" | "pro" | "enterprise";
      analysesUsed: number;
      analysesLimit: number;
      githubUsername?: string | null;
      stripeCustomerId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    plan: "free" | "pro" | "enterprise";
    analysesUsed: number;
    stripeCustomerId?: string | null;
    githubUsername?: string | null;
  }
}

async function ensureUserTable() {
  await runMigrations();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                SERIAL PRIMARY KEY,
      email             TEXT UNIQUE NOT NULL,
      name              TEXT,
      image             TEXT,
      github_username   TEXT,
      plan              TEXT NOT NULL DEFAULT 'free',
      analyses_used     INT  NOT NULL DEFAULT 0,
      stripe_customer_id TEXT,
      created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);
  `);
}

async function upsertUser(email: string, name?: string | null, image?: string | null, githubUsername?: string | null) {
  await ensureUserTable();
  const res = await pool.query(
    `INSERT INTO users (email, name, image, github_username)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET
       name = COALESCE(EXCLUDED.name, users.name),
       image = COALESCE(EXCLUDED.image, users.image),
       github_username = COALESCE(EXCLUDED.github_username, users.github_username),
       updated_at = NOW()
     RETURNING *`,
    [email, name, image, githubUsername]
  );
  return res.rows[0];
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: { params: { scope: "read:user user:email" } },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      try {
        const githubUsername =
          account?.provider === "github"
            ? (profile as { login?: string })?.login ?? null
            : null;
        await upsertUser(user.email, user.name, user.image, githubUsername);
        return true;
      } catch (e) {
        console.error("SignIn DB error:", e);
        return false;
      }
    },

    async jwt({ token, user, account, profile, trigger }) {
      // Initial sign-in — load from DB
      if (user?.email) {
        try {
          await ensureUserTable();
          const res = await pool.query("SELECT * FROM users WHERE email = $1", [user.email]);
          const dbUser = res.rows[0];
          if (dbUser) {
            token.userId = String(dbUser.id);
            token.plan = dbUser.plan ?? "free";
            token.analysesUsed = dbUser.analyses_used ?? 0;
            token.stripeCustomerId = dbUser.stripe_customer_id ?? null;
            token.githubUsername =
              account?.provider === "github"
                ? (profile as { login?: string })?.login ?? dbUser.github_username
                : dbUser.github_username;
          }
        } catch (e) {
          console.error("JWT DB error:", e);
        }
      }

      // Refresh on update trigger
      if (trigger === "update" && token.userId) {
        try {
          const res = await pool.query("SELECT * FROM users WHERE id = $1", [token.userId]);
          const dbUser = res.rows[0];
          if (dbUser) {
            token.plan = dbUser.plan;
            token.analysesUsed = dbUser.analyses_used;
            token.stripeCustomerId = dbUser.stripe_customer_id;
          }
        } catch {}
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? "";
        session.user.plan = (token.plan as "free" | "pro" | "enterprise") ?? "free";
        session.user.analysesUsed = token.analysesUsed ?? 0;
        session.user.analysesLimit = PLAN_LIMITS[token.plan ?? "free"] ?? 5;
        session.user.stripeCustomerId = token.stripeCustomerId ?? null;
        session.user.githubUsername = token.githubUsername ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
};

export default authOptions;
