import { ReactNode } from "react";
import { Logo } from "./logo";
import { ThemeToggle } from "./ui/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./language-switcher";
import { DocumentationButtons } from "./documentation-buttons";

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}

export function Layout({ 
  children, 
  showHeader = true, 
  showFooter = true 
}: LayoutProps) {
  const { user, logoutMutation } = useAuth();
  const { t } = useTranslation();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {showHeader && (
        <header className="bg-background shadow-md border-b border-border sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center">
              <div className="flex items-center cursor-pointer mr-8" onClick={() => window.location.href = "/"}>
                <Logo size="md" />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-2 relative group">
                  <a href="/" className="mr-3 p-2 rounded-full hover:bg-accent transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </a>
                  <button className="flex items-center gap-1 text-sm font-medium">
                    <span>{user.name || user.username}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:rotate-180">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-md shadow-lg bg-card border border-border overflow-hidden z-10 hidden group-hover:block">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border">
                        <span className="font-medium block">{user.name || user.username}</span>
                        <span className="block text-xs">{user.email || user.username}</span>
                      </div>
                      <div className="px-4 py-2 text-sm border-b border-border">
                        <div className="text-muted-foreground mb-2">{t('header.settings')}</div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">{t('header.language')}</span>
                          <LanguageSwitcher />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{t('header.theme')}</span>
                          <ThemeToggle />
                        </div>
                      </div>
                      <div 
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm hover:bg-accent cursor-pointer"
                      >
                        {t('header.logout')}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  className="px-3 py-1 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
                  onClick={() => window.location.href = "/auth"}
                >
                  {t('header.signIn')}
                </div>
              )}
            </div>
          </div>
        </header>
      )}
      
      <main className="flex-grow">
        {children}
      </main>
      
      {showFooter && (
        <footer className="bg-background border-t border-border py-6">
          <div className="container mx-auto px-4">
            <div className="flex justify-center">
              <div className="text-sm text-muted-foreground">
                {t('common.footer', { year: new Date().getFullYear() })}
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}