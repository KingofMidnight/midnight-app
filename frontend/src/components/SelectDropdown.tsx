import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface SelectDropdownOption {
  value: string;
  label: string;
}

interface SelectDropdownProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: SelectDropdownOption[];
  placeholder?: string;
  searchable?: boolean;
}

const SelectDropdown = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  searchable = true,
}: SelectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setQuery("");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <label className="text-xs font-medium text-muted-foreground block">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="h-10 min-h-[2.5rem] w-full flex items-center px-2 border border-border rounded-md bg-secondary text-left text-sm text-foreground hover:bg-secondary/80 transition-colors focus:outline-none"
        >
          <span className="flex-1">
            {selectedOption ? selectedOption.label : placeholder || "Selectâ€¦"}
          </span>
          <svg
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
            {searchable && (
              <div className="p-2 border-b border-border">
                <Input
                  placeholder={placeholder || "Searchâ€¦"}
                  className="border-none bg-background text-sm h-8"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            <div className="max-h-48 overflow-auto">
              {filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt.value);
                  }}
                  className={`w-full px-2 py-1.5 text-left text-sm transition-colors ${
                    value === opt.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              {filteredOptions.length === 0 && (
                <div className="px-2 py-2 text-xs text-muted-foreground">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectDropdown;

