'use client';

import { useState } from 'react';

import {
  LoginForm,
} from '@/components/login-form';

import {
  ChatInterface,
} from '@/components/chat-interface';

import type {
  CustomerIdentity,
} from '@/lib/chat.types';

interface AuthSession {
  token: string;
  customer: CustomerIdentity;
}

export default function Home() {
  const [session, setSession] =
    useState<AuthSession | null>(null);

  if (!session) {
    return (
      <LoginForm
        onAuthenticated={(token, customer) =>
          setSession({
            token,
            customer,
          })
        }
      />
    );
  }

  return (
    <ChatInterface
      token={session.token}
      customer={session.customer}
      onLogout={() => setSession(null)}
    />
  );
}