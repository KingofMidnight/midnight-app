import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

const PaginationControls = ({ page, totalPages, onPageChange, totalItems, pageSize }: PaginationControlsProps) => {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
      <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
        {totalItems !== undefined && pageSize ? `${(page - 1) * pageSize + 1}â€“${Math.min(page * pageSize, totalItems)} of ${totalItems}` : `Page ${page} of ${totalPages}`}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`dot-${i}`} className="px-2 text-muted-foreground text-sm">â€¦</span>
            ) : (
              <Button key={p} variant={p === page ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" onClick={() => onPageChange(p)}>
                {p}
              </Button>
            )
          )}
        </div>
        <div className="flex sm:hidden items-center gap-1">
          <span className="text-sm font-medium px-2">{page}</span>
          <span className="text-muted-foreground text-sm">of {totalPages}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;

