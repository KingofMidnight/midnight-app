import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, Clock, Undo2 } from "lucide-react";
import { api, type AdminModerationAction } from "@/lib/api";

// Admin view of one user's full moderation record, with the option to withdraw
// a warning or timeout that was issued by mistake.
export const ModerationHistoryDialog = ({
  user, onClose, onChanged,
}: {
  user: { id: string; username: string | null } | null;
  onClose: () => void;
  onChanged: () => void;
}) => {
  const { toast } = useToast();
  const [actions, setActions] = useState<AdminModerationAction[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setActions((await api.admin.getModeration(user.id)).actions);
    } catch (err) {
      toast({ title: "Error loading history", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { load(); }, [load]);

  const revoke = async (a: AdminModerationAction) => {
    if (!confirm(`Withdraw this ${a.action_type}? It stays in the history, marked as withdrawn.`)) return;
    try {
      await api.admin.revokeModerationAction(a.id);
      toast({ title: `${a.action_type === "warning" ? "Warning" : "Timeout"} withdrawn` });
      load();
      onChanged();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const now = Date.now();
  const isActive = (a: AdminModerationAction) =>
    !a.revoked_at && (a.action_type === "warning" || (!!a.expires_at && new Date(a.expires_at).getTime() > now));
  const warnings = actions.filter((a) => a.action_type === "warning" && !a.revoked_at).length;
  const timeouts = actions.filter((a) => a.action_type === "timeout" && !a.revoked_at).length;

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Moderation history — @{user?.username ?? "user"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {warnings} warning{warnings === 1 ? "" : "s"} · {timeouts} timeout{timeouts === 1 ? "" : "s"}
        </p>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : actions.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">No moderation actions on record.</p>
        ) : (
          <div className="space-y-2">
            {actions.map((a) => (
              <div key={a.id} className="p-3 rounded-lg border border-border bg-secondary/30 space-y-1 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  {a.action_type === "warning"
                    ? <AlertTriangle className="h-4 w-4 text-warning" />
                    : <Clock className="h-4 w-4 text-destructive" />}
                  <span className="font-medium capitalize">{a.action_type}</span>
                  {a.revoked_at
                    ? <Badge variant="outline" className="text-xs">Withdrawn</Badge>
                    : isActive(a) && a.action_type === "timeout" && <Badge variant="destructive" className="text-xs">Active</Badge>}
                  {a.acknowledged_at && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3" /> seen</span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <p><span className="text-muted-foreground">Reason:</span> {a.reason}</p>
                {a.message && <p className="whitespace-pre-line text-foreground/80">{a.message}</p>}
                {a.action_type === "timeout" && a.expires_at && (
                  <p className="text-xs text-muted-foreground">Until {new Date(a.expires_at).toLocaleString()}</p>
                )}
                {isActive(a) && (
                  <Button size="sm" variant="ghost" onClick={() => revoke(a)} className="gap-1 h-7 px-2 text-xs">
                    <Undo2 className="h-3 w-3" /> Withdraw
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
