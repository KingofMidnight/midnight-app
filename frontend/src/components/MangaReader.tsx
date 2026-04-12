import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ReadingMode = "continuous" | "double-page" | "single-page" | "paginated-rtl";
type Theme = "light" | "dark" | "sepia";

interface MangaReaderProps {
  images: string[];
  chapterTitle: string;
  onProgressChange?: (page: number, total: number) => void;
}

export const MangaReader = ({ images, chapterTitle, onProgressChange }: MangaReaderProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [readingMode, setReadingMode] = useState<ReadingMode>("single-page");
  const [theme, setTheme] = useState<Theme>("light");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showOverlay, setShowOverlay] = useState(true);

  const goToPreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(0, prev - (readingMode === "double-page" ? 2 : 1)));
  }, [readingMode]);

  const goToNextPage = useCallback(() => {
    const increment = readingMode === "double-page" ? 2 : 1;
    setCurrentPage((prev) => Math.min(images.length - 1, prev + increment));
  }, [images.length, readingMode]);

  useEffect(() => {
    onProgressChange?.(currentPage, images.length);
  }, [currentPage, images.length, onProgressChange]);

  const getImageUrl = (index: number) => {
    if (index < 0 || index >= images.length) return null;
    return images[index];
  };

  const getThemeClasses = () => {
    switch (theme) {
      case "dark":
        return "bg-gray-900 text-white";
      case "sepia":
        return "bg-yellow-50";
      default:
        return "bg-white";
    }
  };

  const isRTL = readingMode === "paginated-rtl";
  const pages = isRTL
    ? [getImageUrl(currentPage + 1), getImageUrl(currentPage)]
    : [getImageUrl(currentPage), getImageUrl(currentPage + 1)];

  return (
    <div className={`relative w-full h-screen flex flex-col ${getThemeClasses()} transition-colors`}>
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/30 to-transparent p-4">
        <h2 className="text-white font-semibold">{chapterTitle}</h2>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {readingMode === "continuous" ? (
          <div className="w-full h-full overflow-y-auto">
            {images.map((url, idx) => (
              <div key={idx} className="w-full flex justify-center py-2">
                <img
                  src={url}
                  alt={`Page ${idx + 1}`}
                  className="max-w-full"
                  style={{ filter: theme === "sepia" ? "sepia(0.3)" : undefined }}
                />
              </div>
            ))}
          </div>
        ) : readingMode === "double-page" ? (
          <div className="flex gap-2 items-center justify-center h-full">
            {pages[0] && (
              <img
                src={pages[0]}
                alt="Left page"
                className="max-h-full max-w-1/2"
                style={{ zoom: zoomLevel / 100, filter: theme === "sepia" ? "sepia(0.3)" : undefined }}
              />
            )}
            {pages[1] && (
              <img
                src={pages[1]}
                alt="Right page"
                className="max-h-full max-w-1/2"
                style={{ zoom: zoomLevel / 100, filter: theme === "sepia" ? "sepia(0.3)" : undefined }}
              />
            )}
          </div>
        ) : (
          <img
            src={pages[0] || ""}
            alt={`Page ${currentPage + 1}`}
            className="max-h-full max-w-full"
            style={{ zoom: zoomLevel / 100, filter: theme === "sepia" ? "sepia(0.3)" : undefined }}
          />
        )}
      </div>

      {showOverlay && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousPage}
            disabled={currentPage === 0}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft />
          </Button>

          <div className="text-white text-center">
            <p className="text-sm">
              Page {currentPage + 1} of {images.length}
            </p>
            <input
              type="range"
              min="0"
              max={images.length - 1}
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              className="w-32 h-1"
            />
          </div>

          <div className="flex gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Settings />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Reader Settings</SheetTitle>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                  <div>
                    <label className="text-sm font-medium block mb-2">Reading Mode</label>
                    <Select value={readingMode} onValueChange={(v) => setReadingMode(v as ReadingMode)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single-page">Single Page</SelectItem>
                        <SelectItem value="double-page">Double Page</SelectItem>
                        <SelectItem value="paginated-rtl">RTL (Right-to-Left)</SelectItem>
                        <SelectItem value="continuous">Continuous Scroll</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-2">Theme</label>
                    <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="sepia">Sepia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-2">Zoom: {zoomLevel}%</label>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={zoomLevel}
                      onChange={(e) => setZoomLevel(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowOverlay(false)}
              className="text-white hover:bg-white/20"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}

      {!showOverlay && (
        <button
          onClick={() => setShowOverlay(true)}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 hover:opacity-100 transition-opacity p-4"
        >
          Show Controls
        </button>
      )}
    </div>
  );
};
