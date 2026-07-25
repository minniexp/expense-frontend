import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  // Get the cookies store
  const cookieStore = cookies();
  
  
  // Also delete NextAuth cookies
  cookieStore.delete('next-auth.session-token');
  cookieStore.delete('next-auth.callback-url');
  cookieStore.delete('next-auth.csrf-token');
  
  return NextResponse.json({ success: true });
} 