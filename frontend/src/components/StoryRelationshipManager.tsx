import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Link2, Trash2 } from "lucide-react";
import type { RelationshipType, StoryType } from "@/types/domain";

interface RelatedStorySummary {
  id: string;
  title: string;
  type: StoryType;
}

interface OutgoingRelationship {
  id: string;
  relationship: RelationshipType;
  target: RelatedStorySummary;
}

interface IncomingRelationship {
  id: string;
  relationship: RelationshipType;
  source: RelatedStorySummary;
}

const relationshipOptions: { value: RelationshipType; label: string }[] = [
  { value: "adapts", label: "Adapts" },
  { value: "sequel", label: "Sequel to" },
  { value: "prequel", label: "Prequel to" },
  { value: "spinoff", label: "Spin-off of" },
  { value: "alternative", label: "Alternative version of" },
];

const incomingLabels: Record<RelationshipType, string> = {
  adapts: "Adapted as",
  sequel: "Has sequel",
  prequel: "Has prequel",
  spinoff: "Has spin-off",
  alternative: "Has alternative version",
};

interface StoryRelationshipManagerProps {
  storyId: string;
}

const StoryRelationshipManager = ({ storyId }: StoryRelationshipManagerProps) => {
  const { toast } = useToast();
  const [outgoing, setOutgoing] = useState<OutgoingRelationship[]>([]);
  const [incoming, setIncoming] = useState<IncomingRelationship[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RelatedStorySummary[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<RelatedStorySummary | null>(null);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("adapts");
  const [saving, setSaving] = useState(false);

  const loadRelationships = useCallback(async () => {
    const [outgoingRes, incomingRes] = await Promise.all([
      supabase
        .from("story_relationships")
        .select("id, relationship, target:stories!story_relationships_target_story_id_fkey(id, title, type)")
        .eq("source_story_id", storyId),
      supabase
        .from("story_relationships")
        .select("id, relationship, source:stories!story_relationships_source_story_id_fkey(id, title, type)")
        .eq("target_story_id", storyId),
    ]);

    setOutgoing(
      (outgoingRes.data ?? []).filter((r): r is OutgoingRelationship => !!r.target)
    );
    setIncoming(
      (incomingRes.data ?? []).filter((r): r is IncomingRelationship => !!r.source)
    );
  }, [storyId]);

  useEffect(() => { loadRelationships(); }, [loadRelationships]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("stories")
        .select("id, title, type")
        .neq("id", storyId)
        .ilike("title", `%${query}%`)
        .limit(8);
      setSearchResults(data ?? []);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, storyId]);

  const handleAdd = async () => {
    if (!selectedTarget) return;
    setSaving(true);
    const { error } = await supabase.from("story_relationships").insert({
      source_story_id: storyId,
      target_story_id: selectedTarget.id,
      relationship: relationshipType,
    });
    setSaving(false);

    if (error) {
      toast({ title: "Could not add relationship", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Related work added" });
    setSelectedTarget(null);
    setSearchQuery("");
    setSearchResults([]);
    loadRelationships();
  };

  const handleRemove = async (relationshipId: string) => {
    const { error } = await supabase.from("story_relationships").delete().eq("id", relationshipId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    loadRelationships();
  };

  return (
    <div className="border border-border rounded-lg bg-card p-6 space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" /> Related Works
      </h3>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="relative flex-1 min-w-[220px]">
          <Input
            placeholder="Search a story to link..."
            value={selectedTarget ? selectedTarget.title : searchQuery}
            onChange={(e) => { setSelectedTarget(null); setSearchQuery(e.target.value); }}
            className="bg-background border-border"
          />
          {!selectedTarget && searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-56 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => { setSelectedTarget(result); setSearchResults([]); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center justify-between"
                >
                  <span className="truncate">{result.title}</span>
                  <span className="text-xs text-muted-foreground capitalize ml-2">{result.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Select value={relationshipType} onValueChange={(v) => setRelationshipType(v as RelationshipType)}>
          <SelectTrigger className="w-44 bg-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {relationshipOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleAdd} disabled={!selectedTarget || saving} className="gap-1.5">
          <Link2 className="h-4 w-4" /> Add
        </Button>
      </div>

      {outgoing.length > 0 && (
        <div className="space-y-1.5">
          {outgoing.map((rel) => (
            <div key={rel.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-secondary/40">
              <span>
                {relationshipOptions.find((o) => o.value === rel.relationship)?.label ?? rel.relationship}{" "}
                <span className="font-medium">{rel.target.title}</span>
              </span>
              <button onClick={() => handleRemove(rel.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {incoming.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">Referenced by other works</p>
          {incoming.map((rel) => (
            <div key={rel.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-secondary/20 text-muted-foreground">
              <span>
                {incomingLabels[rel.relationship]} <span className="font-medium text-foreground">{rel.source.title}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {outgoing.length === 0 && incoming.length === 0 && (
        <p className="text-sm text-muted-foreground">No related works linked yet.</p>
      )}
    </div>
  );
};

export default StoryRelationshipManager;
