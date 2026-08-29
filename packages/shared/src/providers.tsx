import React from 'react';
import { AuthProvider } from './auth';
import { ToastProvider } from './toast';
import { RouterProvider } from './router';

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <RouterProvider>
        <AuthProvider>{children}</AuthProvider>
      </RouterProvider>
    </ToastProvider>
  );
}
