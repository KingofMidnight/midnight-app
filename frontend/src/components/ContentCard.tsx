import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Image, Tv, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type IconComponent = typeof BookOpen;

const typeIcons: Record<string, IconComponent> = {
  novel: BookOpen, manga: Image, anime: Tv
};

const statusColors: Record<string, string> = {
  ongoing: "bg-success/20 text-success border-success/30",
  completed: "bg-primary/20 text-primary border-primary/30",
  hiatus: "bg-warning/20 text-warning border-warning/30",
};

export interface StoryCardData {
  id: string;
  title: string;
  author_name?: string | null;
  created_by?: string | null;
  cover_image_url?: string | null;
  type: string;
  status: string;
  genres?: string[] | null;
  view_count?: number | null;
}

const ContentCard = ({ story }: { story: StoryCardData }) => {
  const Icon = typeIcons[story.type] || BookOpen;
  const navigate = useNavigate();
  // Rendered as a div (not <a>) because it can contain a nested author <Link>;
  // nesting <a> inside <a> is invalid HTML and breaks click behavior in real browsers.
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/story/${story.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/story/${story.id}`);
        }
      }}
      className="group block rounded-lg overflow-hidden bg-card border border-border transition-colors duration-200 hover:border-primary/40 cursor-pointer"
    >
      <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
        {story.cover_image_url ? (
          <img src={story.cover_image_url} alt={story.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2">
          <Badge variant="secondary" className="text-xs capitalize bg-background/80 backdrop-blur-sm border-none px-1.5 sm:px-2 py-0.5">
            <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />{story.type}
          </Badge>
        </div>
        {story.view_count != null && story.view_count > 0 && (
          <div className="absolute bottom-1.5 right-1.5">
            <span className="inline-flex items-center gap-0.5 text-[10px] bg-background/80 backdrop-blur-sm text-muted-foreground px-1.5 py-0.5 rounded-full">
              <Eye className="h-2.5 w-2.5" />
              {story.view_count >= 1000
                ? `${(story.view_count / 1000).toFixed(1)}k`
                : story.view_count}
            </span>
          </div>
        )}
      </div>
      <div className="p-2 sm:p-3 space-y-1 sm:space-y-1.5">
        <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {story.title}
        </h3>
        {story.created_by ? (
          <Link
            to={`/profile/${story.created_by}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted-foreground truncate hover:text-primary transition-colors"
          >
            {story.author_name || "Unknown author"}
          </Link>
        ) : (
          story.author_name && (
            <p className="text-xs text-muted-foreground truncate">{story.author_name}</p>
          )
        )}
        <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full border capitalize ${statusColors[story.status] || ""}`}>
          {story.status}
        </span>
      </div>
    </div>
  );
};

export default ContentCard;

