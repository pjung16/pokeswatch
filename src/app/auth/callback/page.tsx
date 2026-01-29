"use client"

import { Suspense } from 'react';
import { AuthCallback } from '@/app/components/AuthCallback';
import { useAuth } from '@/app/hooks/useAuth';

function AuthCallbackContent() {
  const { handleAuthCallback } = useAuth();

  return <AuthCallback onAuthSuccess={handleAuthCallback} />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
