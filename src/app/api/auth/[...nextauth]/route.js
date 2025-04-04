import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Check if user is allowed
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/fetch-by-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: profile.email }),
          credentials: 'include'
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
    maxAge: 60 * 60 * 24 * 180, // 180 days
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
});

export { handler as GET, handler as POST }; 