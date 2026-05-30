import type { Database } from "@/integrations/supabase/types";

export type AppRole       = Database["public"]["Enums"]["app_role"];
export type StoryType     = Database["public"]["Enums"]["story_type"];
export type StoryStatus   = Database["public"]["Enums"]["story_status"];
export type ContentOrigin = Database["public"]["Enums"]["content_origin"];
export type ListType      = Database["public"]["Enums"]["list_type"];
export type RelationshipType = Database["public"]["Enums"]["relationship_type"];
export type ReportStatus  = Database["public"]["Enums"]["report_status"];
export type ReportType    = Database["public"]["Enums"]["report_type"];
export type ReviewStatus  = "pending" | "approved" | "rejected";

export type Story        = Database["public"]["Tables"]["stories"]["Row"];
export type StoryInsert  = Database["public"]["Tables"]["stories"]["Insert"];
export type StoryUpdate  = Database["public"]["Tables"]["stories"]["Update"];

export type Chapter      = Database["public"]["Tables"]["chapters"]["Row"];
export type ChapterInsert = Database["public"]["Tables"]["chapters"]["Insert"];
export type ChapterUpdate = Database["public"]["Tables"]["chapters"]["Update"];

export type Episode      = Database["public"]["Tables"]["episodes"]["Row"];
export type EpisodeInsert = Database["public"]["Tables"]["episodes"]["Insert"];
export type EpisodeUpdate = Database["public"]["Tables"]["episodes"]["Update"];

export type Profile      = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type UserRole     = Database["public"]["Tables"]["user_roles"]["Row"];
export type UserList     = Database["public"]["Tables"]["user_lists"]["Row"];
export type UserProgress = Database["public"]["Tables"]["user_progress"]["Row"];
export type UserBan      = Database["public"]["Tables"]["user_bans"]["Row"];

export type Rating       = Database["public"]["Tables"]["ratings"]["Row"];
export type Comment      = Database["public"]["Tables"]["comments"]["Row"];
export type Report       = Database["public"]["Tables"]["reports"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type HiddenStory  = Database["public"]["Tables"]["hidden_stories"]["Row"];
export type StoryRelationship = Database["public"]["Tables"]["story_relationships"]["Row"];

export interface UserFavorite {
  id: string;
  user_id: string;
  story_id: string;
  created_at: string;
}

export interface CreatorFollower {
  id: string;
  follower_user_id: string;
  creator_user_id: string;
  followed_at: string;
}

export interface CommentWithProfile {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
  story_id: string;
  user_id: string;
  parent_comment_id?: string | null;
  profiles: { username: string | null; avatar_url: string | null } | null;
}

export interface StoryWithProfile extends Story {
  profiles: { username: string | null; display_name: string | null } | null;
}

export interface ChapterWithStory extends Chapter {
  stories: { title: string; type: StoryType; created_by: string | null } | null;
}

export interface EpisodeWithStory extends Episode {
  stories: { title: string; type: StoryType; created_by: string | null } | null;
}

export interface UserListWithStory extends UserList {
  stories: Story | null;
}

export interface UserProgressWithStory extends UserProgress {
  stories: Story | null;
}

export interface UserWithRoles extends Profile {
  roles: AppRole[];
}

export interface ReportWithRelations extends Report {
  profiles: { username: string | null } | null;
  stories: { title: string } | null;
}

export interface UserFavoriteWithStory extends UserFavorite {
  stories?: Story | null;
}

export interface CreatorFollowerWithProfiles extends CreatorFollower {
  profiles?: { username: string | null; display_name: string | null } | null;
}

