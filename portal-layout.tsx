import { ReactNode } from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Home } from "lucide-react";

interface PortalLayoutProps {
  children: ReactNode;
  title: string;
  portalType: string;
  subtitle?: string;
  className?: string;
  showBackToPortals?: boolean;
}

export function PortalLayout({
  children,
  title,
  portalType,
  subtitle,
  className,
  showBackToPortals = true,
}: PortalLayoutProps) {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="container mx-auto py-8 flex-grow">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-sm font-medium text-muted-foreground mb-1 block">
                {portalType} {t("portal.portal")}
              </span>
              <h1 className="text-4xl font-bold text-white">{title}</h1>
              {subtitle && (
                <p className="text-muted-foreground mt-2">{subtitle}</p>
              )}
            </div>
            {showBackToPortals && (
              <button
                onClick={() => window.location.href = "/portals"}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-transparent border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all text-sm"
              >
                <Home size={16} />
                {t("portal.allPortals")}
              </button>
            )}
          </div>
        </div>

        <Card className={cn("bg-card text-card-foreground p-6", className)}>
          {children}
        </Card>
      </div>
    </Layout>
  );
}