
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const withAuth = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  const AuthComponent = (props: P) => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // Check for auth token in localStorage
      const token = localStorage.getItem('authToken');
      if (token) {
        setIsAuthenticated(true);
      } else {
        router.replace('/login');
      }
      setIsLoading(false);
    }, [router]);

    if (isLoading) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!isAuthenticated) {
      // This is a fallback, but useEffect should already have redirected.
      return null;
    }
    
    return <WrappedComponent {...props} />;
  };

  AuthComponent.displayName = `WithAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return AuthComponent;
};

export default withAuth;
