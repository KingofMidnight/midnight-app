import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, ShieldOff, Loader2 } from "lucide-react";
import PaginationControls from "@/components/PaginationControls";
import { api as backendApi } from "@/lib/api";
import type { UserBan, Profile } from "@/types/domain";

const PAGE_SIZE = 20;

type ProfileRow = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

const AdminBansSection = () => {
  const { toast } = useToast();
  const [bans, setBans] = useState<UserBan[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_bans")
      .select("*")
      .order("banned_at", { ascending: false });

    setBans(data ?? []);

    if (data?.length) {
      const ids = [...new Set(data.map((b) => b.user_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      const map: Record<string, ProfileRow> = {};
      profs?.forEach((p) => { map[p.id] = p; });
      setProfiles(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const unban = async (ban: UserBan) => {
    try {
      await backendApi.admin.unbanUser(ban.user_id);
      toast({ title: "User unbanned successfully" });
      load();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const filtered = bans.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const p = profiles[b.user_id];
    return (
      (p?.username ?? "").toLowerCase().includes(q) ||
      (p?.display_name ?? "").toLowerCase().includes(q) ||
      b.reason.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeBans = bans.filter((b) => b.is_active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by username or reason..."
            className="pl-10 bg-background border-border"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          {activeBans} active {activeBans === 1 ? "ban" : "bans"}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>User</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Banned at</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      {search ? "No bans match your search." : "No bans found."}
                    </TableCell>
                  </TableRow>
                ) : paged.map((ban) => {
                  const p = profiles[ban.user_id];
                  return (
                    <TableRow key={ban.id}>
                      <TableCell>
                        <p className="font-medium text-sm">
                          {p?.display_name ?? p?.username ?? ban.user_id}
                        </p>
                        {p?.username && (
                          <p className="text-xs text-muted-foreground">@{p.username}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        <span className="line-clamp-2">{ban.reason}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ban.is_active ? "destructive" : "secondary"}>
                          {ban.is_active ? "Active" : "Lifted"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(ban.banned_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {ban.expires_at
                          ? new Date(ban.expires_at).toLocaleDateString()
                          : "Permanent"}
                      </TableCell>
                      <TableCell className="text-right">
                        {ban.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unban(ban)}
                            className="gap-1.5 text-xs"
                          >
                            <ShieldOff className="h-3.5 w-3.5" /> Unban
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
          />
        </>
      )}
    </div>
  );
};

export default AdminBansSection;

