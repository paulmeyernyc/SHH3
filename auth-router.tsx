import { Switch, Route, useLocation } from 'wouter';
import { ReactNode } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

// ProtectedRouteWrapper ensures AuthProvider is available inside the Route
export function ProtectedRouteWrapper({ path, children }: { path: string; children: ReactNode }) {
  return (
    <Route path={path}>
      <AuthProviderWrapper>
        {children}
      </AuthProviderWrapper>
    </Route>
  );
}

// Ensures auth context is available inside Route components
export function RouteWrapper({ path, children }: { path: string; children: ReactNode }) {
  return (
    <Route path={path}>
      <AuthProviderWrapper>
        {children}
      </AuthProviderWrapper>
    </Route>
  );
}

// Re-provides the auth context to ensure it's available in the route
function AuthProviderWrapper({ children }: { children: ReactNode }) {
  try {
    const auth = useAuth();
    // Auth context is available, just render children
    return <>{children}</>;
  } catch (error) {
    console.error("Auth context unavailable in route, re-providing:", error);
    // Auth context not available, wrap in a new provider
    return <AuthProvider>{children}</AuthProvider>;
  }
}

// A protected route component that requires authentication
export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  return (
    <Route path={path}>
      <AuthCheck>
        <Component />
      </AuthCheck>
    </Route>
  );
}

// Component that checks authentication and redirects if needed
function AuthCheck({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  
  console.log("AuthCheck:", { user, isLoading });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login
    navigate("/auth");
    return null;
  }

  return <>{children}</>;
}