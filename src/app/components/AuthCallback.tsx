"use client"

// components/AuthCallback.tsx
// Use this component on your callback route (e.g., /auth/callback)
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface AuthCallbackProps {
  onAuthSuccess: (accessToken: string, user: { id: string; email: string }) => void;
}

export function AuthCallback({ onAuthSuccess }: AuthCallbackProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Your backend redirects here with token in URL or you parse from response
    // Adjust based on how your backend returns the token
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || '/';
    const token = params.get('token');
    const userId = params.get('userId');
    const email = params.get('email');

    if (token && userId && email) {
      onAuthSuccess(token, { id: userId, email });
      router.push(redirect);
    } else {
      // Handle error
      router.push('/login?error=auth_failed');
    }
  }, [searchParams, onAuthSuccess, router]);

  return <div>Authenticating...</div>;
}