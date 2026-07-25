import GoogleProvider from 'next-auth/providers/google';

/**
 * Single source of truth for NextAuth configuration.
 *
 * This MUST be shared with `getServerSession()`. The config below sets a custom session cookie
 * name (`next-auth.session-token`) even in production, where NextAuth's default would be
 * `__Secure-next-auth.session-token`. A second, partial copy of these options would look for
 * the default name, find no cookie, and every server-side session lookup would fail in
 * production while working perfectly in local development.
 */
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // This callback runs on the Next.js SERVER, never in the browser, so it is the correct
        // and only place to hold INTERNAL_API_SECRET.
        //
        // We send Google's signed id_token rather than an email string. The backend verifies
        // that signature against Google's published keys and reads the identity out of the
        // verified claims. Previously this posted `{ email }` to an endpoint with no auth at
        // all, which meant anyone who knew an approved address could mint a 180-day
        // full-access token straight from the internet.
        const idToken = account?.id_token;
        if (!idToken) {
          console.error('Google sign-in returned no id_token — refusing to authenticate');
          return '/auth/error?error=validation_failed';
        }

        const internalSecret = process.env.INTERNAL_API_SECRET;
        if (!internalSecret) {
          console.error('INTERNAL_API_SECRET is not set — refusing to authenticate');
          return '/auth/error?error=server_error';
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/fetch-by-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': internalSecret,
          },
          body: JSON.stringify({ idToken }),
          cache: 'no-store',
        });

        if (!res.ok) {
          console.error('Error validating user:', await res.text());
          return '/auth/error?error=validation_failed';
        }

        const data = await res.json();
        
        if (!data.user || !data.user.isApproved) {
          return '/auth/error?error=not_approved';
        }
        
        // Store the token in the user session
        user.token = data.token;
        user.accessLevel = data.user.accessLevel;
        return true;
      } catch (error) {
        console.error('Sign in error:', error);
        return '/auth/error?error=server_error';
      }
    },
    async redirect({ url, baseUrl }) {
      // Allow the redirect to respect the originally requested URL
      // If the URL is within your app, redirect to that URL
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // For sign-ins without a specific redirect URL, go to summary
      return '/summary';
    },
    async jwt({ token, user }) {
      // Pass token from OAuth to JWT
      if (user) {
        console.log("jwt callback - setting token from user");
        token.accessToken = user.token;
        token.accessLevel = user.accessLevel;
      }
      return token;
    },
    async session({ session, token }) {
      // IMPORTANT: Make sure this is correctly saving the token
      
      // Make sure the accessToken is being set correctly
      session.accessToken = token.accessToken;
      session.accessLevel = token.accessLevel;

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    // Matches the backend session token's 7-day lifetime. Leaving this at 180 days would keep
    // a NextAuth session alive long after the backend token inside it had expired, producing
    // a "signed in" UI whose every API call fails with 401.
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
};
