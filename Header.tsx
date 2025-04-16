import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Bell, ChevronDown, HelpCircle, Menu, Settings, X, Home } from "lucide-react";
import { Link } from "wouter";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from "./ui/theme-toggle";
import { LanguageSwitcher } from "./language-switcher";

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarVisible: boolean;
}

export default function Header({ toggleSidebar, isSidebarVisible }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const { t } = useTranslation();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const userInitials = user?.name 
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase() 
    : user?.username?.substring(0, 2).toUpperCase() || "U";

  return (
    <header className="bg-card border-b border-border shadow-sm z-10 dark:bg-background">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleSidebar} 
            className="md:hidden p-2 rounded-md text-muted-foreground hover:bg-accent"
          >
            {isSidebarVisible ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center">
            <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <h1 className="ml-2 text-xl font-semibold text-foreground">Smart Health Hub</h1>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-primary hover:bg-accent rounded-full">
              <Home size={20} />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent rounded-full">
            <Bell size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent rounded-full">
            <HelpCircle size={20} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="p-1 focus:outline-none rounded-md">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={user?.name || user?.username} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <span className="ml-2 text-sm font-medium text-foreground hidden md:inline-flex">
                    {user?.name || user?.username}
                  </span>
                  <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Your Profile
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t('header.settings')}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-2">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{t('header.theme')}</DropdownMenuLabel>
                    <ThemeToggle />
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{t('header.language')}</DropdownMenuLabel>
                    <LanguageSwitcher />
                  </DropdownMenuGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                {t('header.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
