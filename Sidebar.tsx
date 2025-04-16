import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { href: "/", label: "Dashboard", icon: "dashboard" },
      { href: "/patients", label: "Patient Records", icon: "assignment_ind" },
      { href: "/claims", label: "Claims", icon: "receipt_long" },
      { href: "/providers", label: "Providers", icon: "medical_services" },
    ]
  },
  {
    title: "MANAGEMENT",
    items: [
      { href: "/users", label: "User Management", icon: "people" },
      { href: "/access", label: "Access Control", icon: "admin_panel_settings" },
      { href: "/audit", label: "Audit Log", icon: "history" },
      { href: "/portals/admin", label: "Admin Portal", icon: "admin_panel_settings" },
    ]
  },
  {
    title: "INTEGRATIONS",
    items: [
      { href: "/fhir", label: "FHIR Services", icon: "sync" },
      { href: "/public-health", label: "Public Health", icon: "health_and_safety" },
    ]
  }
];

interface SidebarProps {
  isVisible: boolean;
}

export default function Sidebar({ isVisible }: SidebarProps) {
  const [location] = useLocation();

  return (
    <aside className={cn(
      "bg-white border-r border-gray-200 overflow-y-auto scrollbar-hide",
      "transition-all duration-300 ease-in-out",
      isVisible 
        ? "block fixed inset-y-0 left-0 z-50 w-64 mt-14 md:mt-0 md:static md:block" 
        : "hidden md:block md:w-64"
    )}>
      <nav className="mt-5 px-2 pb-20">
        {navigation.map((section, i) => (
          <div key={i} className={i > 0 ? "mt-8" : ""}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
              {section.title}
            </h2>
            {section.items.map((item, j) => (
              <Link 
                key={j} 
                href={item.href}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  location === item.href
                    ? "text-primary bg-primary-50"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <span className={cn(
                  "material-icons mr-3", 
                  location === item.href ? "text-primary" : "text-gray-400"
                )}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <div className="mt-2">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="ml-2 text-xs font-medium text-gray-500">System Status: Operational</span>
          </div>
          <div className="flex items-center mt-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="ml-2 text-xs font-medium text-gray-500">Zero-Trust Enabled</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
