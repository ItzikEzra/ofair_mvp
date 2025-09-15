import React, { useState } from "react";
import BottomNav from "../navigation/BottomNav";
import { Moon, Sun, User } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessionalId } from "@/hooks/useProfessionalId";
import { useOptimizedNotifications } from "@/hooks/useOptimizedNotifications";
import { useTheme } from "@/components/ThemeProvider";
import BackgroundDecorations from "@/components/layout/BackgroundDecorations";
interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}
const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title
}) => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    isLoading,
    logout
  } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const {
    professionalId
  } = useProfessionalId();
  const {
    unreadCount
  } = useOptimizedNotifications(professionalId);
  const { theme, setTheme } = useTheme();
  const handleLogout = async () => {
    if (isLoading || isLoggingOut) return;
    setIsLoggingOut(true);
    await logout();
  };
  const handleNavigation = (path: string) => {
    if (isLoggingOut) return;
    navigate(path);
    setShowMenu(false);
  };
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 relative">
      <BackgroundDecorations />
      <header className="text-white py-4 px-6 shadow-md flex justify-between items-center bg-transparent">
        {title ? <h1 className="font-bold text-brand-primary text-xl md:text-2xl">{title}</h1> : <div />}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
            title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full text-slate-950 bg-sky-50"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <Button aria-label="תפריט משתמש" variant="ghost" size="icon" disabled={isLoading || isLoggingOut} className="rounded-full text-slate-950 bg-sky-50 focus-visible:ring-2 focus-visible:ring-ofair-blue">
              <div className="relative mx-0 px-[11px]">
                <User aria-hidden />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] leading-none flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 z-30 bg-white text-right">
            <DropdownMenuItem onClick={() => handleNavigation("/profile")} className="text-right justify-end">
              פרופיל מקצועי
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigation("/ratings")} className="text-right justify-end">
              דירוגים וביקורות
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigation("/payments")} className="text-right justify-end">
              התשלומים שלי
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigation("/history")} className="text-right justify-end">
              לקוחות והיסטוריה
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigation("/notifications")} className="relative text-right justify-end">
              התראות
              {unreadCount > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleNavigation("/settings")} className="text-right justify-end">
              הגדרות
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigation("/report-issue")} className="text-right justify-end">
              דווח על בעיה
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} disabled={isLoading || isLoggingOut} className="text-right justify-end">
              {isLoggingOut ? "מתנתק..." : "התנתקות"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>
      <main className="container mx-auto p-4">{children}</main>
      <BottomNav />
    </div>;
};
export default MainLayout;