import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type ContentRating = "safe" | "suggestive" | "mature" | "explicit";

interface ContentRatingSelectProps {
  value?: ContentRating;
  onChange: (rating: ContentRating) => void;
  required?: boolean;
}

const ratingOptions: { value: ContentRating; label: string; description: string; color: string }[] = [
  {
    value: "safe",
    label: "Safe",
    description: "No adult content",
    color: "bg-green-100 text-green-800",
  },
  {
    value: "suggestive",
    label: "Suggestive",
    description: "Mild content, no explicit scenes",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "mature",
    label: "Mature",
    description: "Adult themes and mild explicit content",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "explicit",
    label: "Explicit",
    description: "Graphic adult content",
    color: "bg-red-100 text-red-800",
  },
];

export const ContentRatingSelect = ({ value = "safe", onChange, required }: ContentRatingSelectProps) => {
  const selectedOption = ratingOptions.find((opt) => opt.value === value);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content Rating {required && <span className="text-red-500">*</span>}
        </label>

        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select content rating" />
          </SelectTrigger>
          <SelectContent>
            {ratingOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <Badge className={option.color}>{option.label}</Badge>
                  <span className="text-xs text-gray-500">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedOption && (
        <div className={`p-3 rounded ${selectedOption.color}`}>
          <p className="text-sm font-medium">{selectedOption.label}</p>
          <p className="text-xs opacity-75">{selectedOption.description}</p>
        </div>
      )}
    </div>
  );
};

export const ContentRatingBadge = ({ rating }: { rating: ContentRating }) => {
  const option = ratingOptions.find((opt) => opt.value === rating);
  if (!option) return null;

  return <Badge className={option.color}>{option.label}</Badge>;
};
