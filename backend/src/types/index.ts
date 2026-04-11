export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

export type StoryType = "novel" | "manga" | "anime";
export type StoryStatus = "ongoing" | "completed" | "hiatus";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type ContentOrigin = "original" | "fanfiction";
export type AppRole = "admin" | "moderator" | "user" | "creator";
export type ListType = "reading" | "completed" | "plan_to_read";
export type RelationshipType = "adapts" | "sequel" | "prequel" | "spinoff" | "alternative";
export type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";
export type ReportType = "content" | "user" | "dmca";

export interface Story {
  id: string;
  title: string;
  description: string | null;
  type: StoryType;
  status: StoryStatus;
  review_status: string;
  content_origin: ContentOrigin;
  author_name: string | null;
  genres: string[] | null;
  tags: string[] | null;
  cover_image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  content: string | null;
  image_urls: string[] | null;
  review_status: string;
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: string;
  story_id: string;
  episode_number: number;
  title: string;
  embed_url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  review_status: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  show_lists: boolean;
  show_created_content: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface ProcessedImage {
  relativePath: string;
  publicUrl: string;
  sizeBytes: number;
  width: number;
  height: number;
}

export interface UploadMangaPageResult {
  pages: ProcessedImage[];
}

export interface UploadCoverResult {
  cover: ProcessedImage;
}

export interface EpubChapter {
  title: string;
  content: string;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

