import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import {
  BookOpen, Flag, Eye, Users, Shield, Ban,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  SidebarProvider, SidebarTrigger, Sidebar, SidebarContent,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar,
} from "@/components/ui/sidebar";
import AdminStoriesSection from "./AdminStoriesSection";
import AdminContentReview from "./AdminContentReview";
import AdminReports from "./AdminReports";
import AdminUsersSection from "./AdminUsersSection";
import AdminBansSection from "./AdminBansSection";

const sections = [
  { id: "stories", label: "Stories", icon: BookOpen },
  { id: "review", label: "Content Review", icon: Eye },
  { id: "reports", label: "Reports", icon: Flag },
  { id: "users", label: "Users", icon: Users },
  { id: "bans", label: "Bans", icon: Ban },
];

const AdminSidebar = ({ active, onSelect }: { active: string; onSelect: (id: string) => void }) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border" style={{ top: "3.5rem", height: "calc(100vh - 3.5rem)" }}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="gap-2">
            <Shield className="h-4 w-4" />
            {!collapsed && "Admin Panel"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((s) => (
                <SidebarMenuItem key={s.id}>
                  <SidebarMenuButton
                    onClick={() => onSelect(s.id)}
                    className={`gap-2 ${active === s.id ? "bg-primary/10 text-primary font-medium" : ""}`}
                  >
                    <s.icon className="h-4 w-4" />
                    {!collapsed && <span>{s.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState("stories");
  const [stats, setStats] = useState({
    totalStories: 0,
    pendingReview: 0,
    totalUsers: 0,
    totalReports: 0,
    totalBans: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const storiesCount = await supabase.from("stories").select("id", { count: "exact" }).eq("review_status", "approved");
        const pendingCount = await supabase.from("stories").select("id", { count: "exact" }).eq("review_status", "pending");
        const usersCount = await supabase.from("profiles").select("id", { count: "exact" });
        const reportsCount = await supabase.from("reports").select("id", { count: "exact" });
        const bansCount = await supabase.from("user_bans").select("id", { count: "exact" }).eq("is_active", true);

        setStats({
          totalStories: storiesCount.count ?? 0,
          pendingReview: pendingCount.count ?? 0,
          totalUsers: usersCount.count ?? 0,
          totalReports: reportsCount.count ?? 0,
          totalBans: bansCount.count ?? 0,
        });
      } catch (error) {
        console.error("Failed to load admin stats", error);
      }
    };
    loadStats();
  }, []);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" />;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Access denied. Admin only.</p></div>;

  return (
    <SidebarProvider>
      <div className="flex w-full" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
        <AdminSidebar active={activeSection} onSelect={setActiveSection} />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b border-border px-4 gap-3">
            <SidebarTrigger />
            <h1 className="text-lg font-bold">{sections.find((s) => s.id === activeSection)?.label}</h1>
          </header>

          {}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 border-b border-border">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground uppercase">Approved Stories</p>
              <p className="text-2xl font-bold">{stats.totalStories}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground uppercase">Pending Stories</p>
              <p className="text-2xl font-bold">{stats.pendingReview}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground uppercase">Users</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground uppercase">Reports</p>
              <p className="text-2xl font-bold">{stats.totalReports}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground uppercase">Bans</p>
              <p className="text-2xl font-bold">{stats.totalBans}</p>
            </div>
          </div>

          <main className="flex-1 p-6 overflow-y-auto">
            {activeSection === "stories" && <AdminStoriesSection />}
            {activeSection === "review" && <AdminContentReview />}
            {activeSection === "reports" && <AdminReports />}
            {activeSection === "users" && <AdminUsersSection />}
            {activeSection === "bans" && <AdminBansSection />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;

