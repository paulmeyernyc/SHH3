import React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import PlatformOverview from "./pages/platform-overview";
import NetworkServices from "./pages/network-services";
import ServicesPage from "./pages/services";
import PHRPage from "./pages/phr-page";
import ConsentPage from "./pages/consent-page";
import NetworkDirectoryPage from "./pages/network-directory/NetworkDirectoryPage";
import IntegrationGatewayPage from "./pages/integration-gateway";
import { ThemeProvider } from "./lib/theme-context";
import { Logo } from "./components/logo";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "./components/layout";

// Import i18n
import "./lib/i18n";
import { useTranslation } from "react-i18next";

// Simple router
function useLocation() {
  const [path, setPath] = useState(window.location.pathname);

  const navigate = (to: string) => {
    window.history.pushState({}, "", to);
    setPath(to);
  };

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return [path, navigate] as const;
}

// Home page with Network, Services, Portal sections
function Dashboard() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  
  const goToNetworkDirectory = () => {
    window.location.href = '/network/directory';
  };
  
  const goToServices = () => {
    window.location.href = '/services';
  };
  
  const goToIntegration = () => {
    window.location.href = '/integration-gateway';
  };
  
  const goToPHR = () => {
    navigate('/phr');
  };
  
  const goToConsent = () => {
    navigate('/consent');
  };
  
  const goToPortals = () => {
    window.location.href = '/portals';
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-4 bg-gradient-to-r from-[#b088f9] to-[#9d6efe] bg-clip-text text-transparent">
            Smart Health Hub
          </h1>
          <p className="text-lg mb-8 max-w-3xl mx-auto">
            A comprehensive healthcare interoperability platform enabling seamless medical data exchange through
            advanced microservices architecture and intelligent service management.
          </p>
        </div>
        
        {/* Main Sections - Three Tile Layout */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Network Services Tile */}
            <div className="bg-card rounded-lg shadow-md p-6 border border-border hover:border-primary/50 transition-colors flex flex-col">
              <h2 className="text-2xl font-bold font-display mb-3">Network Services</h2>
              <p className="text-muted-foreground mb-4">
                Comprehensive suite of network services including interoperability solutions,
                data management tools, and integrated clinical workflows.
              </p>
              <div className="mt-auto">
                <button 
                  onClick={goToServices}
                  className="bg-transparent border border-primary text-primary py-2 px-4 rounded-md hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-white transition-all font-medium inline-flex items-center"
                >
                  View All Services
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* User Portals Tile */}
            <div className="bg-card rounded-lg shadow-md p-6 border border-border hover:border-primary/50 transition-colors flex flex-col">
              <h2 className="text-2xl font-bold font-display mb-3">User Portals</h2>
              <p className="text-muted-foreground mb-4">
                Personalized portals for all healthcare stakeholders, providing tailored experiences
                for patients, providers, and organizations.
              </p>
              <div className="mt-auto">
                <button 
                  onClick={goToPortals}
                  className="bg-transparent border border-primary text-primary py-2 px-4 rounded-md hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-white transition-all font-medium inline-flex items-center"
                >
                  Access Portals
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Network Directory Tile */}
            <div className="bg-card rounded-lg shadow-md p-6 border border-border hover:border-primary/50 transition-colors flex flex-col">
              <h2 className="text-2xl font-bold font-display mb-3">Network Directory</h2>
              <p className="text-muted-foreground mb-4">
                Directory of providers, organizations, and health plans. Discover partners 
                and facilitate seamless integration with healthcare entities.
              </p>
              <div className="mt-auto">
                <button 
                  onClick={goToNetworkDirectory}
                  className="bg-transparent border border-primary text-primary py-2 px-4 rounded-md hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-white transition-all font-medium inline-flex items-center"
                >
                  Explore Network
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Tools and Testing Section */}
        <section className="mb-8">
          <div className="border-t border-border pt-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold font-display mb-2">Developer Tools</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Access specialized tools for platform testing and integration development
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
              <a 
                href="/testing-portal"
                className="flex items-center justify-center gap-2 bg-transparent border border-primary text-primary py-2 px-6 rounded-md hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-white transition-all font-medium"
                style={{ width: '205px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                Testing Portal
              </a>
              <a 
                href="/integration-gateway"
                className="flex items-center justify-center gap-2 bg-transparent border border-primary text-primary py-2 px-6 rounded-md hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-white transition-all font-medium"
                style={{ width: '205px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 11a9 9 0 0 1 9 9" />
                  <path d="M4 4a16 16 0 0 1 16 16" />
                  <circle cx="5" cy="19" r="1" />
                </svg>
                Integration Gateway
              </a>
              <a 
                href="/api-documentation"
                className="flex items-center justify-center gap-2 bg-transparent border border-primary text-primary py-2 px-6 rounded-md hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-white transition-all font-medium"
                style={{ width: '205px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 5l7 7-7 7M5 12h15" />
                </svg>
                Documentation
              </a>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a 
                href="/system-architecture" 
                className="flex items-center justify-center gap-2 text-primary border border-primary hover:bg-primary/5 px-6 py-3 rounded-md transition-colors"
                style={{ width: '205px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="8" height="8" rx="2"></rect>
                  <rect x="14" y="2" width="8" height="8" rx="2"></rect>
                  <rect x="2" y="14" width="8" height="8" rx="2"></rect>
                  <rect x="14" y="14" width="8" height="8" rx="2"></rect>
                </svg>
                System Architecture
              </a>
              <a 
                href="/service-documentation" 
                className="flex items-center justify-center gap-2 text-primary border border-primary hover:bg-primary/5 px-6 py-3 rounded-md transition-colors"
                style={{ width: '205px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <path d="M14 2v6h6"></path>
                  <path d="M16 13H8"></path>
                  <path d="M16 17H8"></path>
                  <path d="M10 9H8"></path>
                </svg>
                Service Documentation
              </a>
              <a 
                href="/api-documentation" 
                className="flex items-center justify-center gap-2 text-primary border border-primary hover:bg-primary/5 px-6 py-3 rounded-md transition-colors"
                style={{ width: '205px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                  <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                </svg>
                API Reference
              </a>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

// Auth page with login form
function AuthPage() {
  const [currentPath] = useLocation();
  const { user, loginMutation, isLoading } = useAuth();
  const { t } = useTranslation();
  
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("password");
  
  // Simple redirection if already logged in
  useEffect(() => {
    if (user && currentPath === "/auth") {
      window.location.href = "/";
    }
  }, [user, currentPath]);
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };
  
  if (isLoading) {
    return (
      <Layout showHeader={false} showFooter={false}>
        <div className="flex items-center justify-center flex-grow">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout showHeader={false} showFooter={false}>
      <div className="flex flex-grow bg-background text-foreground">
        {/* Left column with form */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="flex justify-center mb-8">
              <Logo size="lg" />
            </div>
            
            <h2 className="text-2xl font-bold mb-6 text-center font-display">{t('auth.signIn')}</h2>
            
            <div className="bg-card text-card-foreground rounded-lg shadow-md p-8 border border-border">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('auth.username')}</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-2 rounded-md border border-input bg-background text-foreground"
                    placeholder={t('auth.username')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('auth.password')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 rounded-md border border-input bg-background text-foreground"
                    placeholder={t('auth.password')}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#b088f9] to-[#9d6efe] text-primary-foreground py-2 px-4 rounded-md hover:from-[#b088f9]/90 hover:to-[#9d6efe]/90 transition-all font-medium mt-2"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : t('auth.signIn')}
                </button>
                <p className="text-sm text-center mt-4 text-muted-foreground">
                  {t('auth.defaultLogin')}
                </p>
              </form>
            </div>
            
            <p className="text-sm text-center mt-6">
              <a href="/platform" className="text-primary hover:text-primary/80 font-medium">
                {t('auth.platformOverviewNoLogin')}
              </a>
            </p>
          </div>
        </div>
        
        {/* Right column with hero section */}
        <div className="hidden md:flex md:w-1/2 bg-primary/10 items-center justify-center p-8">
          <div className="max-w-lg">
            <h1 className="text-4xl font-bold font-display mb-4 bg-gradient-to-r from-[#b088f9] to-[#9d6efe] bg-clip-text text-transparent">
              Smart Health Hub
            </h1>
            <p className="text-lg mb-6">
              A comprehensive healthcare interoperability platform enabling seamless medical data exchange through
              advanced microservices architecture and intelligent service management.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <div className="bg-primary/20 p-1 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <span>FHIR R4 fully compatible service integration</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="bg-primary/20 p-1 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <span>Advanced service discovery and gateway systems</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="bg-primary/20 p-1 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <span>Comprehensive security and communication protocols</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Not found page
function NotFound() {
  const { t } = useTranslation();
  return (
    <Layout showHeader={false} showFooter={false}>
      <div className="flex flex-grow items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <h1 className="text-7xl font-bold bg-gradient-to-r from-[#b088f9] to-[#9d6efe] bg-clip-text text-transparent">404</h1>
          <h2 className="text-2xl font-display font-semibold mt-4 text-foreground">{t('notFound.title')}</h2>
          <p className="text-muted-foreground mt-2">{t('notFound.message')}</p>
          <button
            onClick={() => window.location.href = "/"}
            className="mt-6 inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
          >
            {t('notFound.returnHome')}
          </button>
        </div>
      </div>
    </Layout>
  );
}

// Main router component
function AppRouter() {
  const [currentPath] = useLocation();
  const { user, isLoading } = useAuth();
  
  // Handle loading state
  if (isLoading) {
    return (
      <Layout showHeader={false} showFooter={false}>
        <div className="flex items-center justify-center flex-grow">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  // Handle authentication redirect
  if (!user && currentPath !== "/auth" && currentPath !== "/platform") {
    window.location.href = "/auth";
    return null;
  }
  
  // Render the correct page based on path
  if (currentPath === "/") {
    return <Dashboard />;
  } else if (currentPath === "/auth") {
    return <AuthPage />;
  } else if (currentPath === "/platform" || currentPath === "/network") {
    // Redirect deprecated routes to the unified services page
    window.location.href = "/services";
    return null;
  } else if (currentPath === "/services") {
    return <ServicesPage />;
  } else if (currentPath === "/network/directory") {
    return <NetworkDirectoryPage />;
  } else if (currentPath === "/phr") {
    return <PHRPage />;
  } else if (currentPath === "/consent") {
    return <ConsentPage />;
  } else if (currentPath === "/integration" || currentPath === "/integration-gateway") {
    return <IntegrationGatewayPage />;
  } else if (currentPath === "/system-architecture") {
    const SystemArchitecturePage = React.lazy(() => import("./pages/system-architecture"));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <SystemArchitecturePage />
      </React.Suspense>
    );
  } else if (currentPath === "/service-documentation") {
    const ServiceDocumentationPage = React.lazy(() => import("./pages/service-documentation"));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <ServiceDocumentationPage />
      </React.Suspense>
    );
  } else if (currentPath === "/api-documentation") {
    const ApiDocumentationPage = React.lazy(() => import("./pages/api-documentation"));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <ApiDocumentationPage />
      </React.Suspense>
    );
  } else if (currentPath === "/testing-portal") {
    const TestingPortalPage = React.lazy(() => import("./pages/testing-portal"));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <TestingPortalPage />
      </React.Suspense>
    );
  } 
  // Portal routes
  else if (currentPath === "/portals") {
    const PortalsPage = React.lazy(() => import("./pages/portals"));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <PortalsPage />
      </React.Suspense>
    );
  } else if (currentPath === "/portals/user") {
    const UserPortalPage = React.lazy(() => import("./pages/portals/user"));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <UserPortalPage />
      </React.Suspense>
    );
  } else if (currentPath === "/portals/patient") {
    const PatientPortalPage = React.lazy(() => import("./pages/portals/patient"));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <PatientPortalPage />
      </React.Suspense>
    );
  } else if (currentPath === "/portals/provider") {
    const ProviderPortalPage = React.lazy(() => import("./pages/portals/provider"));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <ProviderPortalPage />
      </React.Suspense>
    );
  } else if (currentPath === "/portals/organization") {
    const OrganizationPortalPage = React.lazy(() => import("./pages/portals/organization"));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <OrganizationPortalPage />
      </React.Suspense>
    );
  } else if (currentPath === "/portals/plan") {
    const PlanPortalPage = React.lazy(() => import("./pages/portals/plan"));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <PlanPortalPage />
      </React.Suspense>
    );
  } else if (currentPath === "/portals/employer") {
    const EmployerPortalPage = React.lazy(() => import("./pages/portals/employer"));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <EmployerPortalPage />
      </React.Suspense>
    );
  } else if (currentPath === "/portals/partner") {
    const PartnerPortalPage = React.lazy(() => import("./pages/portals/partner"));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <PartnerPortalPage />
      </React.Suspense>
    );
  } else if (currentPath === "/portals/admin") {
    const AdminPortalPage = React.lazy(() => import("./pages/portals/admin"));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <AdminPortalPage />
      </React.Suspense>
    );
  } else {
    return <NotFound />;
  }
}

// Main app
function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRouter />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
