import { compare } from 'bcrypt-ts';
import NextAuth, { type User, type Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { getUser } from '@/lib/db/queries';

import { authConfig } from './auth.config';

interface ExtendedSession extends Session {
  user: User;
}

// Fallback demo user when no database is available
const DEMO_USER = {
  id: 'demo-user-123',
  name: 'Demo User',
  email: 'demo@ilirion.ai'
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        try {
          // Check if we're in a development environment with no database
          if (!process.env.POSTGRES_URL && (email === 'demo@ilirion.ai' || !email)) {
            console.warn('Using demo user since database is not configured');
            return DEMO_USER as any;
          }
          
          console.log(`Attempting to authorize user with email: ${email}`);
          const users = await getUser(email);
          console.log(`Found ${users.length} users with email: ${email}`);
          
          if (users.length === 0) {
            console.log('No users found with this email');
            return null;
          }
          
          try {
            // biome-ignore lint: Forbidden non-null assertion.
            const passwordsMatch = await compare(password, users[0].password!);
            console.log(`Password match result: ${passwordsMatch}`);
            if (!passwordsMatch) return null;
            return users[0] as any;
          } catch (passwordError) {
            console.error('Error comparing passwords:', passwordError);
            return null;
          }
        } catch (error) {
          console.error('Error during authorization:', error);
          // If we can't access the database, allow a demo user
          if (!process.env.POSTGRES_URL) {
            console.warn('Falling back to demo user due to database error');
            return DEMO_USER as any;
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: any;
    }) {
      if (session.user) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
});
