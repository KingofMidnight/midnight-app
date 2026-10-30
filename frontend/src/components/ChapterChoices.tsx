import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ChoiceOption {
  id: string;
  label: string;
  sort_order: number;
  target_chapter_id: string;
  target_chapter_number: number;
  target_chapter_title: string;
}

interface Props {
  chapterId: string;
  onChoose: (targetChapterId: string) => void;
}

/**
 * Renders the reader-facing branch choices leading out of a CYOA chapter.
 * Returns null (renders nothing) when the chapter has no outgoing choices,
 * so callers can fall back to their normal "next chapter" / "back to story" UI.
 */
const ChapterChoices = ({ chapterId, onChoose }: Props) => {
  const [choices, setChoices] = useState<ChoiceOption[] | null>(null);

  useEffect(() => {
    let active = true;
    setChoices(null);
    const load = async () => {
      const { data } = await supabase
        .from("chapter_choices")
        .select("id, label, sort_order, target_chapter_id, chapters:chapter_choices_target_chapter_id_fkey(chapter_number, title)")
        .eq("source_chapter_id", chapterId)
        .order("sort_order");
      if (!active) return;
      const mapped: ChoiceOption[] = (data ?? []).map((row: any) => ({
        id: row.id,
        label: row.label,
        sort_order: row.sort_order,
        target_chapter_id: row.target_chapter_id,
        target_chapter_number: row.chapters?.chapter_number ?? 0,
        target_chapter_title: row.chapters?.title ?? "",
      }));
      setChoices(mapped);
    };
    load();
    return () => { active = false; };
  }, [chapterId]);

  if (!choices || choices.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
        <GitBranch className="h-4 w-4" /> What happens next?
      </p>
      <div className="flex flex-col gap-2">
        {choices.map((choice) => (
          <Button
            key={choice.id}
            variant="outline"
            className="justify-start text-left h-auto py-3 px-4 whitespace-normal"
            onClick={() => onChoose(choice.target_chapter_id)}
          >
            {choice.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ChapterChoices;
