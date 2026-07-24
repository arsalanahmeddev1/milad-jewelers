import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Diamond, Users, MessageSquare, LogOut, Search, UserCircle, Menu, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationsBell } from "@/components/notifications-bell";
import { MiladLogo } from "@/lib/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const adminNav: NavItem[] = [
  { to: "/admin/orders", label: "All Orders", icon: Diamond },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/profile", label: "Profile", icon: UserCircle },
];
const clientNav: NavItem[] = [
  { to: "/projects", label: "My Projects", icon: Diamond },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

export function AppShell({ user, isAdmin, children }: { user: User; isAdmin: boolean; children: React.ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [profile, setProfile] = useState<{ full_name: string | null; company_name: string | null; email: string | null } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("full_name, company_name, email").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user.id]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const nav = isAdmin ? adminNav : clientNav;
  const displayName = isAdmin ? "Administrator" : profile?.company_name || profile?.full_name || user.email?.split("@")[0] || "Client";
  const initials = displayName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const title = (() => {
    if (pathname.startsWith("/admin/orders")) return "All Orders";
    if (pathname.startsWith("/admin/clients")) return "Clients";
    if (pathname.startsWith("/admin/messages")) return "Messages";
    if (pathname.startsWith("/projects")) return pathname === "/projects" ? "My Projects" : "Project Details";
    if (pathname.startsWith("/messages")) return "Messages";
    if (pathname.startsWith("/profile")) return "Profile";
    return "";
  })();

  const SidebarContent = (
    <>
      <div className="p-5 md:p-6 flex items-center justify-between md:justify-start gap-3 border-b border-sidebar-border">
        <div className="flex items-center gap-3 min-w-0">
          <MiladLogo className="w-10 h-10 shrink-0" />
          <span className="font-serif text-2xl tracking-[0.25em] text-primary truncate">MILAD</span>
        </div>
        <button
          className="md:hidden p-1.5 rounded-md hover:bg-sidebar-accent/50"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="text-xs font-serif tracking-widest text-sidebar-foreground/60 mb-2 px-2">
          {isAdmin ? "MANAGEMENT" : "MENU"}
        </div>
        <ul className="space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 group relative overflow-hidden ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:translate-x-0.5"
                  }`}
                >
                  {active && <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />}
                  <item.icon className={`w-4 h-4 shrink-0 transition-transform ${active ? "text-primary" : "group-hover:scale-110"}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center gap-3 px-2">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{displayName}</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">{profile?.email || user.email}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-sidebar-border px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-sidebar text-sidebar-foreground flex-col shrink-0 sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground flex flex-col shadow-xl transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {SidebarContent}
        </aside>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 md:h-16 border-b bg-background/95 backdrop-blur-md flex items-center px-4 md:px-8 gap-3 md:gap-6">
          <button
            className="md:hidden p-2 -ml-2 rounded-md hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-serif text-lg md:text-2xl font-bold flex-1 truncate">{title}</h1>
          <div className="relative w-96 max-w-full hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9 bg-card" />
          </div>
          <NotificationsBell userId={user.id} />
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
