import React from "react";
import { Home, HandPlatter, Megaphone, Briefcase, Network } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
const BottomNav: React.FC = () => {
  let path = "/";
  try {
    const location = useLocation();
    path = location.pathname;
  } catch (error) {
    console.log("Router context not available, fallback to default path");
  }
  const navItems = [{
    name: "אזור אישי",
    icon: Home,
    path: "/dashboard"
  }, {
    name: "הגש ליד",
    icon: HandPlatter,
    path: "/submit-lead"
  }, {
    name: "לוח מודעות",
    icon: Megaphone,
    path: "/announcements"
  }, {
    name: "העבודות שלי",
    icon: Briefcase,
    path: "/my-jobs"
  }, {
    name: "הלידים שלי",
    icon: Network,
    path: "/my-leads"
  }];
  return (
    <nav
      role="navigation"
      aria-label="ניווט תחתון"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-brand-neutral200/70 shadow-soft-md pb-safe"
    >
      <ul className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = path === item.path || (item.path === "/dashboard" && (path === "/" || path === "/dashboard"));
          return (
            <li key={item.path} className="flex-1">
              <Link
                to={item.path}
                aria-label={item.name}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center min-w-0 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-xl py-2 px-3 ${
                  isActive ? "text-brand-primary" : "text-slate-600 hover:text-brand-primary"
                }`}
              >
                <div
                  className={`flex items-center justify-center rounded-xl transition-all duration-200 w-11 h-11 md:w-12 md:h-12 ${
                    isActive ? "bg-brand-primary/10 text-brand-primary scale-105" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 1.5} />
                </div>
                <span
                  className={`text-[11px] text-center leading-tight mt-1 font-medium ${
                    isActive ? "text-ofair-blue" : "text-gray-600"
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
export default BottomNav;