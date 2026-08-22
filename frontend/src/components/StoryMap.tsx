import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GitBranch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface StoryMapChapter {
  id: string;
  chapter_number: number;
  title: string;
  review_status?: string;
}

interface RawChoice {
  id: string;
  source_chapter_id: string;
  target_chapter_id: string;
  label: string;
  sort_order: number;
}

interface StoryMapProps {
  /** Story id to self-load all chapters for (creator view). Omit if `chapters` is provided. */
  storyId?: string;
  /** Pre-filtered chapter list to render (reader view — usually approved-only). */
  chapters?: StoryMapChapter[];
  /** Builds the reader URL for a chapter. Omit to render nodes as non-interactive. */
  getChapterHref?: (chapterId: string) => string;
  /** Show a small review-status dot on each node (creator view). */
  showStatusBadges?: boolean;
  /** Message shown when the story has no branch choices yet. */
  emptyHint?: string;
}

const NODE_W = 200;
const NODE_H = 66;
const GAP_X = 72;
const GAP_Y = 24;

interface LaidOutNode extends StoryMapChapter {
  level: number;
  x: number;
  y: number;
}

function layoutNodes(chapters: StoryMapChapter[], edges: RawChoice[]) {
  const ids = new Set(chapters.map((c) => c.id));
  const validEdges = edges.filter((e) => ids.has(e.source_chapter_id) && ids.has(e.target_chapter_id));

  const indegree = new Map<string, number>();
  chapters.forEach((c) => indegree.set(c.id, 0));
  validEdges.forEach((e) => indegree.set(e.target_chapter_id, (indegree.get(e.target_chapter_id) ?? 0) + 1));

  const adjacency = new Map<string, string[]>();
  validEdges.forEach((e) => {
    adjacency.set(e.source_chapter_id, [...(adjacency.get(e.source_chapter_id) ?? []), e.target_chapter_id]);
  });

  const sortedChapters = [...chapters].sort((a, b) => a.chapter_number - b.chapter_number);
  const levels = new Map<string, number>();
  const visited = new Set<string>();

  const bfsFrom = (startIds: string[]) => {
    let queue = startIds.map((id) => ({ id, level: 0 }));
    while (queue.length > 0) {
      const next: typeof queue = [];
      for (const { id, level } of queue) {
        if (visited.has(id)) continue;
        visited.add(id);
        levels.set(id, level);
        for (const targetId of adjacency.get(id) ?? []) {
          if (!visited.has(targetId)) next.push({ id: targetId, level: level + 1 });
        }
      }
      queue = next;
    }
  };

  const roots = sortedChapters.filter((c) => (indegree.get(c.id) ?? 0) === 0);
  bfsFrom((roots.length > 0 ? roots : sortedChapters.slice(0, 1)).map((c) => c.id));
  // Anything left over is an isolated island or part of a pure cycle — seed additional roots.
  const remaining = sortedChapters.filter((c) => !visited.has(c.id));
  if (remaining.length > 0) bfsFrom(remaining.map((c) => c.id));

  const byLevel = new Map<number, StoryMapChapter[]>();
  sortedChapters.forEach((c) => {
    const level = levels.get(c.id) ?? 0;
    byLevel.set(level, [...(byLevel.get(level) ?? []), c]);
  });

  const nodes: LaidOutNode[] = [];
  const sortedLevels = Array.from(byLevel.keys()).sort((a, b) => a - b);
  sortedLevels.forEach((level) => {
    byLevel.get(level)!.forEach((c, row) => {
      nodes.push({ ...c, level, x: level * (NODE_W + GAP_X), y: row * (NODE_H + GAP_Y) });
    });
  });

  const maxLevel = sortedLevels.length > 0 ? sortedLevels[sortedLevels.length - 1] : 0;
  const maxRows = Math.max(1, ...Array.from(byLevel.values()).map((v) => v.length));

  return {
    nodes,
    edges: validEdges,
    levelOf: levels,
    width: (maxLevel + 1) * NODE_W + maxLevel * GAP_X,
    height: maxRows * NODE_H + (maxRows - 1) * GAP_Y,
  };
}

const statusColor: Record<string, string> = {
  approved: "bg-primary",
  pending: "bg-warning",
  draft: "bg-muted-foreground",
  rejected: "bg-destructive",
};

const StoryMap = ({ storyId, chapters, getChapterHref, showStatusBadges, emptyHint }: StoryMapProps) => {
  const [fetchedChapters, setFetchedChapters] = useState<StoryMapChapter[]>([]);
  const [choices, setChoices] = useState<RawChoice[]>([]);
  const [loading, setLoading] = useState(true);

  const usingOwnChapters = chapters === undefined;

  useEffect(() => {
    if (!usingOwnChapters || !storyId) return;
    let active = true;
    supabase
      .from("chapters")
      .select("id, chapter_number, title, review_status")
      .eq("story_id", storyId)
      .order("chapter_number")
      .then(({ data }) => {
        if (active) setFetchedChapters((data ?? []) as StoryMapChapter[]);
      });
    return () => { active = false; };
  }, [storyId, usingOwnChapters]);

  const effectiveChapters = usingOwnChapters ? fetchedChapters : (chapters ?? []);
  const chapterIdsKey = effectiveChapters.map((c) => c.id).join(",");

  useEffect(() => {
    if (effectiveChapters.length === 0) {
      setChoices([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from("chapter_choices")
      .select("id, source_chapter_id, target_chapter_id, label, sort_order")
      .in("source_chapter_id", effectiveChapters.map((c) => c.id))
      .then(({ data }) => {
        if (!active) return;
        setChoices((data ?? []) as RawChoice[]);
        setLoading(false);
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIdsKey]);

  const layout = useMemo(() => layoutNodes(effectiveChapters, choices), [effectiveChapters, choices]);

  if (loading) {
    return (
      <div className="flex gap-3 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 w-48 rounded-lg bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (effectiveChapters.length === 0) {
    return <p className="text-sm text-muted-foreground">No chapters yet.</p>;
  }

  if (choices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
        <GitBranch className="h-4 w-4" /> {emptyHint ?? "No branch choices have been added yet."}
      </p>
    );
  }

  const positionOf = new Map(layout.nodes.map((n) => [n.id, n]));
  const hasBackward = layout.edges.some((e) => {
    const source = positionOf.get(e.source_chapter_id);
    const target = positionOf.get(e.target_chapter_id);
    return source && target && target.level <= source.level;
  });
  const canvasWidth = Math.max(layout.width, NODE_W);
  const canvasHeight = Math.max(layout.height, NODE_H) + (hasBackward ? 56 : 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card/50 p-6">
      <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
        <svg className="absolute inset-0 pointer-events-none" width={canvasWidth} height={canvasHeight}>
          <defs>
            <marker id="story-map-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" className="fill-primary/60" />
            </marker>
            <marker id="story-map-arrow-back" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" className="fill-muted-foreground/60" />
            </marker>
          </defs>
          {layout.edges.map((edge) => {
            const source = positionOf.get(edge.source_chapter_id);
            const target = positionOf.get(edge.target_chapter_id);
            if (!source || !target) return null;
            const backward = target.level <= source.level;
            const path = backward
              ? (() => {
                  const bStartX = source.x + NODE_W / 2;
                  const bStartY = source.y + NODE_H;
                  const bEndX = target.x + NODE_W / 2;
                  const bEndY = target.y + NODE_H;
                  const dipY = Math.max(bStartY, bEndY) + 48;
                  return `M ${bStartX} ${bStartY} C ${bStartX} ${dipY}, ${bEndX} ${dipY}, ${bEndX} ${bEndY}`;
                })()
              : (() => {
                  const startX = source.x + NODE_W;
                  const startY = source.y + NODE_H / 2;
                  const endX = target.x;
                  const endY = target.y + NODE_H / 2;
                  return `M ${startX} ${startY} C ${startX + (endX - startX) / 2} ${startY}, ${startX + (endX - startX) / 2} ${endY}, ${endX} ${endY}`;
                })();
            return (
              <path
                key={edge.id}
                d={path}
                fill="none"
                strokeWidth={1.5}
                strokeDasharray={backward ? "4 4" : undefined}
                className={backward ? "stroke-muted-foreground/50" : "stroke-primary/50"}
                markerEnd={`url(#${backward ? "story-map-arrow-back" : "story-map-arrow"})`}
              />
            );
          })}
        </svg>

        {layout.nodes.map((node) => {
          const content = (
            <>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {showStatusBadges && (
                  <span className={`h-1.5 w-1.5 rounded-full ${statusColor[node.review_status ?? ""] ?? "bg-muted-foreground"}`} />
                )}
                Chapter {node.chapter_number}
              </div>
              <p className="text-sm font-medium leading-snug line-clamp-2">{node.title}</p>
            </>
          );
          const cardClass =
            "absolute rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/50";
          const style = { left: node.x, top: node.y, width: NODE_W, height: NODE_H };
          return getChapterHref ? (
            <Link key={node.id} to={getChapterHref(node.id)} className={cardClass} style={style}>
              {content}
            </Link>
          ) : (
            <div key={node.id} className={cardClass} style={style}>
              {content}
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-1.5 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5" /> Branch choices
        </p>
        {layout.edges.map((edge) => {
          const source = positionOf.get(edge.source_chapter_id);
          const target = positionOf.get(edge.target_chapter_id);
          if (!source || !target) return null;
          return (
            <p key={edge.id} className="text-xs text-muted-foreground truncate">
              Ch. {source.chapter_number} <span className="text-foreground">&ldquo;{edge.label}&rdquo;</span> → Ch. {target.chapter_number}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default StoryMap;
