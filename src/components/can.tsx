'use client';

import { type ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';

type CanProps = {
  page: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function Can({ page, action, children, fallback = null }: CanProps) {
  const { can } = useAuth();
  if (can(page, action)) return <>{children}</>;
  return <>{fallback}</>;
}
