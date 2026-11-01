import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModerationNotices } from "@/hooks/useModerationNotices";

// Site-wide banner: shows an active timeout, and any warning/timeout notice the
// user hasn't acknowledged yet (one at a time, oldest first).
const ModerationNotices = () => {
  const { pending, timedOutUntil, acknowledge } = useModerationNotices();
  const [busy, setBusy] = useState(false);

  const next = [...pending].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  if (!next && !timedOutUntil) return null;

  const ack = async () => {
    if (!next) return;
    setBusy(true);
    try { await acknowledge(next.id); } finally { setBusy(false); }
  };

  return (
    <div className="border-b border-destructive/30 bg-destructive/10">
      <div className="container mx-auto px-4 py-3 space-y-2 text-sm">
        {timedOutUntil && (
          <p className="flex items-center gap-2 text-destructive font-medium">
            <Clock className="h-4 w-4 flex-shrink-0" />
            You are timed out until {new Date(timedOutUntil).toLocaleString()}. You can still read, but you can't post, comment, rate, report or edit content.
          </p>
        )}
        {next && (
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-destructive mt-0.5 hidden sm:block" />
            <div className="flex-1 space-y-1">
              <p className="font-medium">
                {next.action_type === "warning" ? "You received a warning from the moderators" : "You were timed out by the moderators"}
                {pending.length > 1 && <span className="text-muted-foreground font-normal"> (+{pending.length - 1} more)</span>}
              </p>
              <p><span className="text-muted-foreground">Reason:</span> {next.reason}</p>
              {next.message && <p className="whitespace-pre-line text-foreground/80">{next.message}</p>}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" onClick={ack} disabled={busy}>I understand</Button>
              <Button asChild size="sm" variant="outline"><Link to="/notices">All notices</Link></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModerationNotices;
