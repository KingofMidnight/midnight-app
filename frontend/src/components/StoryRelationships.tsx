import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { RelationshipType } from "@/types/domain";
import { Link2 } from "lucide-react";

interface RelatedStorySummary {
  id: string;
  title: string;
  type: string;
  cover_image_url: string | null;
}

interface RelationshipEntry {
  id: string;
  relationship: RelationshipType;
  direction: "outgoing" | "incoming";
  story: RelatedStorySummary;
}

const outgoingLabels: Record<RelationshipType, string> = {
  adapts: "Adapts",
  sequel: "Sequel to",
  prequel: "Prequel to",
  spinoff: "Spin-off of",
  alternative: "Alternative version of",
};

const incomingLabels: Record<RelationshipType, string> = {
  adapts: "Adapted as",
  sequel: "Has sequel",
  prequel: "Has prequel",
  spinoff: "Has spin-off",
  alternative: "Has alternative version",
};

interface StoryRelationshipsProps {
  storyId: string;
}

const StoryRelationships = ({ storyId }: StoryRelationshipsProps) => {
  const [relationships, setRelationships] = useState<RelationshipEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [outgoingRes, incomingRes] = await Promise.all([
        supabase
          .from("story_relationships")
          .select("id, relationship, target:stories!story_relationships_target_story_id_fkey(id, title, type, cover_image_url)")
          .eq("source_story_id", storyId),
        supabase
          .from("story_relationships")
          .select("id, relationship, source:stories!story_relationships_source_story_id_fkey(id, title, type, cover_image_url)")
          .eq("target_story_id", storyId),
      ]);

      const outgoing: RelationshipEntry[] = (outgoingRes.data ?? [])
        .filter((r): r is typeof r & { target: RelatedStorySummary } => !!r.target)
        .map((r) => ({ id: r.id, relationship: r.relationship, direction: "outgoing" as const, story: r.target }));

      const incoming: RelationshipEntry[] = (incomingRes.data ?? [])
        .filter((r): r is typeof r & { source: RelatedStorySummary } => !!r.source)
        .map((r) => ({ id: r.id, relationship: r.relationship, direction: "incoming" as const, story: r.source }));

      setRelationships([...outgoing, ...incoming]);
      setLoading(false);
    };
    load();
  }, [storyId]);

  if (loading || relationships.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" /> Related Works
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {relationships.map((entry) => (
          <Link
            key={entry.id}
            to={`/story/${entry.story.id}`}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors"
          >
            <div className="w-10 h-14 rounded bg-secondary overflow-hidden flex-shrink-0">
              {entry.story.cover_image_url && (
                <img src={entry.story.cover_image_url} alt={entry.story.title} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {entry.direction === "outgoing" ? outgoingLabels[entry.relationship] : incomingLabels[entry.relationship]}
              </p>
              <p className="font-medium truncate">{entry.story.title}</p>
              <p className="text-xs text-muted-foreground capitalize">{entry.story.type}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default StoryRelationships;
