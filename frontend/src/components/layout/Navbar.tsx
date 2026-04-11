import { Link, useLocation, useNavigate } from "react-router-dom";
import { Book, Search, User, Menu, X, Shield, LogOut, Pen, BookOpen, Image, Tv } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "@/components/NotificationBell";
import { siteContent } from "@/lib/content";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isCreator, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = siteContent.nav;

  const navItems = [
    { to: "/", label: t.home, icon: Book },
    { to: "/browse?type=novel", label: siteContent.categories.novels, icon: BookOpen },
    { to: "/browse?type=manga", label: siteContent.categories.manga, icon: Image },
    { to: "/browse?type=anime", label: siteContent.categories.anime, icon: Tv },
    { to: "/browse", label: t.browse, icon: Search },
    { to: "/creator", label: t.creator, icon: Pen, requiresAuth: true, requiresCreator: true },
    { to: "/admin", label: t.admin, icon: Shield, requiresAuth: true, requiresAdmin: true },
    { to: "/profile", label: t.profile, icon: User, requiresAuth: true },
  ];

  const mainNavItems = navItems.filter(item =>
    !['/creator', '/admin', '/profile'].includes(item.to)
  );
  const accountNavItems = navItems.filter(item =>
    ['/creator', '/admin', '/profile'].includes(item.to)
  );
  const mobileNavItems = [...mainNavItems, ...accountNavItems];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (to: string) => {
    if (to === "/") {
      return location.pathname === "/";
    }
    if (to === "/browse") {
      return location.pathname === "/browse" && !location.search;
    }
    if (to.includes("?")) {
      const [path, query] = to.split("?");
      return location.pathname === path && location.search === `?${query}`;
    }
    return location.pathname === to && !location.search;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-xl">
      <div className="container flex h-12 sm:h-14 items-center px-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-1">
            <img src={logo} alt={siteContent.logoAlt} className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="hidden text-sm font-semibold sm:inline-block">{siteContent.siteName}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {mainNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  isActive(item.to)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <nav className="hidden lg:flex items-center gap-1">
            {accountNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  isActive(item.to)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-1 sm:gap-2 pl-2 sm:pl-4 border-l border-border">
            {user ? (
              <>
                <NotificationBell />
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground p-2">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-muted-foreground px-2 sm:px-3 text-xs sm:text-sm" asChild>
                  <Link to="/auth">{siteContent.auth.signIn}</Link>
                </Button>
                <Button size="sm" className="px-2 sm:px-3 text-xs sm:text-sm" asChild>
                  <Link to="/auth">{siteContent.auth.signUp}</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="md:hidden flex items-center gap-1 ml-2 sm:ml-4">
          {user && <NotificationBell />}
          <button className="text-muted-foreground p-1.5 sm:p-2 hover:bg-secondary rounded-md transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-surface animate-fade-in">
          <div className="container py-4 space-y-2 max-h-[calc(100vh-3rem)] overflow-y-auto">
            {}
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Navigation</h3>
              {mainNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.to)
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              ))}
            </div>

            {}
            {user && accountNavItems.length > 0 && (
              <div className="space-y-1 border-t border-border pt-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Account</h3>
                {accountNavItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.to)
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {}
            <div className="flex gap-2 pt-3 border-t border-border mt-3">
              {user ? (
                <Button variant="ghost" size="sm" className="p-2 text-muted-foreground" onClick={() => { handleSignOut(); setMobileOpen(false); }}>
                  <LogOut className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground" asChild>
                    <Link to="/auth" onClick={() => setMobileOpen(false)}>{siteContent.auth.signIn}</Link>
                  </Button>
                  <Button size="sm" className="flex-1" asChild>
                    <Link to="/auth" onClick={() => setMobileOpen(false)}>{siteContent.auth.signUp}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;

