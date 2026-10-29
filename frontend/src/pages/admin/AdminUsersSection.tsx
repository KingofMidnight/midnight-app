import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { User, Search, MoreHorizontal, Trash2, Ban, UserX, Loader2 } from "lucide-react";
import PaginationControls from "@/components/PaginationControls";
import { api as backendApi } from "@/lib/api";
import type { AppRole, UserWithRoles } from "@/types/domain";

const USERS_PAGE_SIZE = 20;

const roleVariants: Record<AppRole, "default" | "secondary" | "destructive" | "outline"> = {
  admin:     "destructive",
  moderator: "default",
  creator:   "outline",
  user:      "secondary",
};

const AdminUsersSection = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [usersPage, setUsersPage] = useState(1);

  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<UserWithRoles | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banning, setBanning] = useState(false);

  const load = useCallback(async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, created_at, bio, show_lists, show_created_content, show_favorites, updated_at")
      .order("created_at", { ascending: false });

    if (!profiles) { setLoading(false); return; }

    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const roleMap: Record<string, AppRole[]> = {};
    roles?.forEach((r) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });

    setUsers(profiles.map((p) => ({ ...p, roles: roleMap[p.id] ?? (["user"] as AppRole[]) })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Role "${role}" added` });
    load();
  };

  const removeRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Role "${role}" removed` });
    load();
  };

  const deleteUser = async (userId: string, username: string | null) => {
    if (!confirm(`Are you sure you want to delete "${username ?? userId}"? This action cannot be undone.`)) return;
    try {
      await backendApi.admin.deleteUser(userId);
      toast({ title: "User deleted" });
      load();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const resetProfile = async (userId: string) => {
    if (!confirm("Reset this user's profile? This clears their display name, bio, and avatar.")) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: null, bio: null, avatar_url: null })
      .eq("id", userId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Profile reset" });
    load();
  };

  const removeContent = async (userId: string) => {
    if (!confirm("Remove all stories created by this user?")) return;
    const { error } = await supabase.from("stories").delete().eq("created_by", userId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "All user content removed" });
  };

  const openBanModal = (u: UserWithRoles) => {
    setBanTarget(u);
    setBanReason("");
    setBanModalOpen(true);
  };

  const confirmBan = async () => {
    if (!banTarget || !banReason.trim()) return;
    setBanning(true);
    try {
      await backendApi.admin.banUser(banTarget.id, banReason.trim());

      toast({ title: `${banTarget.display_name ?? banTarget.username ?? "User"} has been banned` });
      setBanModalOpen(false);
      setBanTarget(null);
      setBanReason("");
      load();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBanning(false);
    }
  };

  const filtered = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.username ?? "").toLowerCase().includes(q) ||
      (u.display_name ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / USERS_PAGE_SIZE);
  const paged = filtered.slice((usersPage - 1) * USERS_PAGE_SIZE, usersPage * USERS_PAGE_SIZE);

  const assignableRoles: AppRole[] = ["creator", "moderator", "admin"];

  if (loading) return <p className="text-muted-foreground">Loading users...</p>;

  return (
    <>
      {}
      <Dialog open={banModalOpen} onOpenChange={(open) => { if (!open) setBanModalOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {banTarget && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Avatar className="h-9 w-9">
                  {banTarget.avatar_url ? <AvatarImage src={banTarget.avatar_url} /> : null}
                  <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {banTarget.display_name ?? banTarget.username ?? "â€”"}
                  </p>
                  {banTarget.username && (
                    <p className="text-xs text-muted-foreground">@{banTarget.username}</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Reason for ban..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="bg-background border-border"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter" && banReason.trim()) confirmBan(); }}
              />
              <p className="text-xs text-muted-foreground">
                The user will be immediately signed out and unable to access the platform.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setBanModalOpen(false)}
                disabled={banning}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                disabled={!banReason.trim() || banning}
                onClick={confirmBan}
              >
                {banning
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Ban className="h-4 w-4" />}
                Confirm Ban
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-10 bg-background border-border"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setUsersPage(1); }}
            />
          </div>
          <p className="text-sm text-muted-foreground whitespace-nowrap">{users.length} users</p>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead>User</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Add Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : paged.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {u.avatar_url ? <AvatarImage src={u.avatar_url} /> : null}
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{u.display_name ?? "No name"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    @{u.username ?? "unknown"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.map((r) => (
                        <Badge key={r} variant={roleVariants[r]} className="text-xs capitalize gap-1">
                          {r}
                          {r !== "user" && (
                            <button
                              onClick={() => removeRole(u.id, r)}
                              className="ml-0.5 hover:opacity-70 transition-opacity"
                            >
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Select onValueChange={(v) => addRole(u.id, v as AppRole)}>
                      <SelectTrigger className="w-28 h-8 text-xs bg-background border-border">
                        <SelectValue placeholder="Add role" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableRoles
                          .filter((r) => !u.roles.includes(r))
                          .map((r) => (
                            <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openBanModal(u)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Ban className="h-4 w-4" /> Ban User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => resetProfile(u.id)} className="gap-2">
                          <UserX className="h-4 w-4" /> Reset Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => removeContent(u.id)} className="gap-2">
                          <Trash2 className="h-4 w-4" /> Remove All Content
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteUser(u.id, u.username)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" /> Delete User Data
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <PaginationControls
          page={usersPage}
          totalPages={totalPages}
          onPageChange={setUsersPage}
          totalItems={filtered.length}
          pageSize={USERS_PAGE_SIZE}
        />
      </div>
    </>
  );
};

export default AdminUsersSection;

