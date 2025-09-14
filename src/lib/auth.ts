import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { nextCookies, toNextJsHandler } from 'better-auth/next-js';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();
const authDbName = process.env.MONGODB_AUTH_DB || 'volunteer_gamify_auth';
export const authDb = client.db(authDbName);

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  database: mongodbAdapter(authDb),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    // kept in auth DB only (NOT in app DB)
    additionalFields: {
      role: { type: 'string', default: 'volunteer', input: false },
      status: { type: 'string', default: 'pending', input: false }, // pending | approved | rejected
    },
  },
  plugins: [nextCookies()],
});

// App Router handler re-export (if you need here)
export const { GET: AUTH_GET, POST: AUTH_POST } = toNextJsHandler(auth.handler);
