import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  console.log("ProtectedRoute rendering for path:", path);

  return (
    <Route path={path}>
      <ProtectedRouteContent Component={Component} />
    </Route>
  );
}

// Separate component that will always be rendered inside the Router context
function ProtectedRouteContent({
  Component
}: {
  Component: () => React.JSX.Element;
}) {
  const [, navigate] = useLocation();
  
  try {
    const { user, isLoading } = useAuth();
    console.log("ProtectedRoute auth data:", { user, isLoading });

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!user) {
      // Use navigate instead of Redirect for cleaner redirection
      navigate("/auth");
      return null;
    }

    return <Component />;
  } catch (error) {
    console.error("Error in ProtectedRouteContent:", error);
    navigate("/auth");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">Authentication error</p>
        </div>
      </div>
    );
  }
}
