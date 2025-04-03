'use client';

import { signIn } from 'next-auth/react';

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn('google')}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-3"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M12.545 12.151L12.545 12.151L12.545 12.151C12.545 9.684 11.354 7.408 9.448 5.942V5.942L12.545 12.151ZM12.545 12.151L20.2 19.805L20.2 19.805C20.746 18.858 21.064 17.795 21.064 16.596C21.064 13.464 19.21 10.815 16.49 9.804L16.49 9.804L12.546 12.151L12.545 12.151ZM3.33 16.596C3.33 19.727 5.693 22.266 8.738 22.658V16.596H3.33ZM3.33 7.404C3.33 10.535 5.693 13.074 8.738 13.466V7.404H3.33Z"
        />
      </svg>
      Sign in with Google
    </button>
  );
}