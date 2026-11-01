import { Navigate } from "react-router-dom";
import { AlertTriangle, CheckCircle, Clock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useModerationNotices } from "@/hooks/useModerationNotices";
import type { ModerationNotice } from "@/lib/api";

const statusOf = (n: ModerationNotice): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
  if (n.revoked_at) return { label: "Withdrawn", variant: "outline" };
  if (n.action_type === "timeout") return n.active ? { label: "Active", variant: "destructive" } : { label: "Expired", variant: "secondary" };
  return { label: "On record", variant: "secondary" };
};

// The user's account notices: every warning and timeout from the moderators.
const Notices = () => {
  const { user, loading: authLoading } = useAuth();
  const { notices, timedOutUntil, loading, acknowledge } = useModerationNotices();

  if (authLoading) return <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account notices</h1>
        <p className="text-muted-foreground text-sm">Warnings and timeouts from the moderation team.</p>
      </div>

      {timedOutUntil && (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-destructive" />
          You are timed out until {new Date(timedOutUntil).toLocaleString()}.
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : notices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground space-y-2">
          <ShieldCheck className="h-10 w-10 mx-auto text-primary" />
          <p>Your account is in good standing. No notices.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => {
            const s = statusOf(n);
            return (
              <div key={n.id} className="p-4 rounded-lg border border-border bg-card space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {n.action_type === "warning"
                    ? <AlertTriangle className="h-4 w-4 text-warning" />
                    : <Clock className="h-4 w-4 text-destructive" />}
                  <span className="font-medium">{n.action_type === "warning" ? "Warning" : "Timeout"}</span>
                  <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm"><span className="text-muted-foreground">Reason:</span> {n.reason}</p>
                {n.message && <p className="text-sm whitespace-pre-line text-foreground/80">{n.message}</p>}
                {n.action_type === "timeout" && n.expires_at && (
                  <p className="text-xs text-muted-foreground">Until {new Date(n.expires_at).toLocaleString()}</p>
                )}
                {n.acknowledged_at ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Acknowledged {new Date(n.acknowledged_at).toLocaleDateString()}
                  </p>
                ) : n.active && (
                  <Button size="sm" onClick={() => acknowledge(n.id)}>I understand</Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notices;
