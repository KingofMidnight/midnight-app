import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Clock } from "lucide-react";
import { api, type TimeoutDuration } from "@/lib/api";

const TIMEOUT_OPTIONS: { value: TimeoutDuration; label: string }[] = [
  { value: "1h",  label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "3d",  label: "3 days" },
  { value: "7d",  label: "7 days" },
  { value: "30d", label: "30 days" },
];

export interface ModerationTarget {
  userId: string;
  username: string | null;
  kind: "warning" | "timeout";
  // Shown in the title, e.g. "reported user" / "reporter"
  role?: string;
  reportId?: string;
  defaultReason?: string;
}

// Issues a warning or a timeout. Both are recorded in the user's moderation
// history and delivered to them as a notice (bell notification + site banner).
export const ModerationActionDialog = ({
  target, onClose, onDone,
}: {
  target: ModerationTarget | null;
  onClose: () => void;
  onDone: () => void;
}) => {
  const { toast } = useToast();
  const [duration, setDuration] = useState<TimeoutDuration>("24h");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setDuration("24h");
    setReason(target.defaultReason ?? "");
    setMessage("");
  }, [target]);

  const isTimeout = target?.kind === "timeout";
  const who = `@${target?.username ?? "user"}`;

  const submit = async () => {
    if (!target || !reason.trim()) return;
    setSaving(true);
    try {
      const body = { reason: reason.trim(), message: message.trim() || undefined, reportId: target.reportId };
      if (isTimeout) {
        await api.admin.timeoutUser(target.userId, { ...body, duration });
        toast({ title: `${who} timed out for ${TIMEOUT_OPTIONS.find((o) => o.value === duration)?.label}` });
      } else {
        await api.admin.warnUser(target.userId, body);
        toast({ title: `Warning sent to ${who}` });
      }
      onDone();
      onClose();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isTimeout ? "Timeout" : "Warn"} {target?.role ? `${target.role} ` : ""}{who}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {isTimeout
              ? "They can still sign in and read, but can't comment, review, rate, report, or publish/edit content until the timeout ends."
              : "No restriction is applied. The warning is added to their record and they'll see it as a notice they must acknowledge."}
            {" "}They will be notified with the reason and your message.
          </p>
          {isTimeout && (
            <Select value={duration} onValueChange={(v) => setDuration(v as TimeoutDuration)}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEOUT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Input
            placeholder="Reason (required, shown to the user)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-background border-border"
            maxLength={500}
          />
          <Textarea
            placeholder="Message to the user (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-background border-border"
            rows={3}
            maxLength={2000}
          />
          <Button onClick={submit} disabled={saving || !reason.trim()} variant={isTimeout ? "destructive" : "default"} className="w-full gap-1.5">
            {isTimeout ? <Clock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {saving ? "Applying..." : isTimeout ? "Apply timeout" : "Send warning"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
