import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import type { ReportType } from "@/types/domain";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Flag } from "lucide-react";

interface ReportDialogProps {

  storyId?: string;
  chapterId?: string;
  episodeId?: string;
  commentId?: string;
  reportedUserId?: string;

  variant?: "ghost" | "outline" | "link";

  iconOnly?: boolean;
}

const ReportDialog = ({
  storyId,
  chapterId,
  episodeId,
  commentId,
  reportedUserId,
  variant = "ghost",
  iconOnly = false,
}: ReportDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ReportType>("content");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [dmcaName, setDmcaName] = useState("");
  const [dmcaEmail, setDmcaEmail] = useState("");
  const [dmcaUrl, setDmcaUrl] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setLoading(true);

    const payload: TablesInsert<"reports"> = {
      reporter_id: user.id,
      report_type: type,
      story_id: storyId || null,
      chapter_id: chapterId || null,
      episode_id: episodeId || null,
      comment_id: commentId || null,
      reported_user_id: reportedUserId || null,
      reason,
      details: details || null,
      dmca_claimant_name: type === "dmca" ? dmcaName || null : null,
      dmca_claimant_email: type === "dmca" ? dmcaEmail || null : null,
      dmca_original_work_url: type === "dmca" ? dmcaUrl || null : null,
    };

    const { error } = await supabase.from("reports").insert(payload);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Report submitted", description: "Our team will review this shortly." });
      setOpen(false);
      setReason("");
      setDetails("");
      setDmcaName("");
      setDmcaEmail("");
      setDmcaUrl("");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <button
            title="Report"
            className="p-1 rounded !text-destructive"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        ) : (
          <Button variant={variant} size="sm" className="gap-1.5 text-destructive">
            <Flag className="h-4 w-4" /> Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit a Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
            <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="content">Content Issue</SelectItem>
              <SelectItem value="user">User Report</SelectItem>
              <SelectItem value="dmca">DMCA / Copyright</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-background border-border"
            required
          />
          <Textarea
            placeholder="Additional details..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="bg-background border-border"
            rows={3}
          />

          {type === "dmca" && (
            <div className="space-y-3 p-3 bg-destructive/10 rounded-lg">
              <p className="text-xs text-destructive font-medium">DMCA Takedown Request</p>
              <Input placeholder="Claimant full name" value={dmcaName} onChange={(e) => setDmcaName(e.target.value)} className="bg-background border-border" />
              <Input placeholder="Claimant email" type="email" value={dmcaEmail} onChange={(e) => setDmcaEmail(e.target.value)} className="bg-background border-border" />
              <Input placeholder="URL to original work" value={dmcaUrl} onChange={(e) => setDmcaUrl(e.target.value)} className="bg-background border-border" />
            </div>
          )}

          <Button onClick={handleSubmit} disabled={loading || !reason.trim()} className="w-full">
            {loading ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;

