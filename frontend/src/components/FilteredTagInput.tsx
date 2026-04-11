import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface FilteredTagInputProps {
  label: string;
  values: string[];
  onChange: (vals: string[]) => void;
  options: string[];
  placeholder?: string;
}

const FilteredTagInput = ({
  label,
  values,
  onChange,
  options,
  placeholder,
}: FilteredTagInputProps) => {
  const [query, setQuery] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [filteredQuery, setFilteredQuery] = useState("");

  const filteredOptions = options.filter(
    (opt) =>
      !values.includes(opt) &&
      opt.toLowerCase().includes(filteredQuery.toLowerCase())
  );

  const addTag = (tag: string) => {
    if (!values.includes(tag)) {
      onChange([...values, tag]);
    }
    setQuery("");
    setFilteredQuery("");
  };

  const removeTag = (tag: string) => {
    onChange(values.filter((t) => t !== tag));
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setTimeout(() => setFilteredQuery(val), 150);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground block">
        {label}
      </label>
      <div className="relative">
        <div className="h-10 min-h-[2.5rem] flex items-center flex-wrap gap-1 px-2 border border-border rounded-md bg-secondary">
          {values.map((tag) => (
            <Badge key={tag} className="gap-1">
              {tag}
              <button type="button" onClick={() => removeTag(tag)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
          <Input
            placeholder={placeholder || "Type to searchâ€¦"}
            className="flex-1 border-none bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus:ring-0 focus:outline-none focus:border-transparent"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filteredOptions.length > 0) {
                e.preventDefault();
                addTag(filteredOptions[0]);
              }
            }}
          />
          {values.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="p-1"
              onClick={() => onChange([])}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {(inputFocused || query) && (
          <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-md border border-border bg-card shadow-lg">
            {filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(opt);
                }}
                className="w-full px-2 py-1.5 text-left text-sm hover:bg-secondary transition-colors"
              >
                {opt}
              </button>
            ))}
            {filteredOptions.length === 0 && query && (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                No matching options
              </div>
            )}
            {inputFocused && !query && filteredOptions.length > 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-t border-border">
                Showing {filteredOptions.length} available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilteredTagInput;

