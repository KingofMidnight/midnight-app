export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {

  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chapters: {
        Row: {
          chapter_number: number
          content: string | null
          created_at: string
          id: string
          image_urls: string[] | null
          review_status: string
          story_id: string
          title: string
          updated_at: string
        }
        Insert: {
          chapter_number: number
          content?: string | null
          created_at?: string
          id?: string
          image_urls?: string[] | null
          review_status?: string
          story_id: string
          title: string
          updated_at?: string
        }
        Update: {
          chapter_number?: number
          content?: string | null
          created_at?: string
          id?: string
          image_urls?: string[] | null
          review_status?: string
          story_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          chapter_id: string | null
          content: string
          created_at: string
          episode_id: string | null
          id: string
          is_approved: boolean | null
          parent_comment_id: string | null
          story_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          content: string
          created_at?: string
          episode_id?: string | null
          id?: string
          is_approved?: boolean | null
          parent_comment_id?: string | null
          story_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          content?: string
          created_at?: string
          episode_id?: string | null
          id?: string
          is_approved?: boolean | null
          parent_comment_id?: string | null
          story_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_followers: {
        Row: {
          id: string
          creator_user_id: string
          follower_user_id: string
          followed_at: string
        }
        Insert: {
          id?: string
          creator_user_id: string
          follower_user_id: string
          followed_at?: string
        }
        Update: {
          id?: string
          creator_user_id?: string
          follower_user_id?: string
          followed_at?: string
        }
        Relationships: []
      }
      episodes: {
        Row: {
          created_at: string
          duration_minutes: number | null
          embed_url: string | null
          episode_number: number
          id: string
          review_status: string
          story_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          embed_url?: string | null
          episode_number: number
          id?: string
          review_status?: string
          story_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          embed_url?: string | null
          episode_number?: number
          id?: string
          review_status?: string
          story_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      hidden_stories: {
        Row: {
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_stories_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          show_created_content: boolean
          show_favorites: boolean
          show_lists: boolean
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          show_created_content?: boolean
          show_favorites?: boolean
          show_lists?: boolean
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          show_created_content?: boolean
          show_favorites?: boolean
          show_lists?: boolean
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          story_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          story_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          story_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          chapter_id: string | null
          comment_id: string | null
          created_at: string
          details: string | null
          dmca_claimant_email: string | null
          dmca_claimant_name: string | null
          dmca_original_work_url: string | null
          episode_id: string | null
          id: string
          reason: string
          report_type: Database["public"]["Enums"]["report_type"]
          reported_user_id: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          story_id: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          chapter_id?: string | null
          comment_id?: string | null
          created_at?: string
          details?: string | null
          dmca_claimant_email?: string | null
          dmca_claimant_name?: string | null
          dmca_original_work_url?: string | null
          episode_id?: string | null
          id?: string
          reason: string
          report_type: Database["public"]["Enums"]["report_type"]
          reported_user_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          story_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          chapter_id?: string | null
          comment_id?: string | null
          created_at?: string
          details?: string | null
          dmca_claimant_email?: string | null
          dmca_claimant_name?: string | null
          dmca_original_work_url?: string | null
          episode_id?: string | null
          id?: string
          reason?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          reported_user_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          story_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          content: string
          created_at: string
          helpful_count: number | null
          id: string
          is_approved: boolean | null
          rating: number | null
          story_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          helpful_count?: number | null
          id?: string
          is_approved?: boolean | null
          rating?: number | null
          story_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          helpful_count?: number | null
          id?: string
          is_approved?: boolean | null
          rating?: number | null
          story_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          author_name: string | null
          average_rating: number | null
          content_origin: Database["public"]["Enums"]["content_origin"]
          content_rating: Database["public"]["Enums"]["content_rating"]
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          genres: string[] | null
          id: string
          review_status: string
          status: Database["public"]["Enums"]["story_status"]
          tags: string[] | null
          title: string
          type: Database["public"]["Enums"]["story_type"]
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_name?: string | null
          average_rating?: number | null
          content_origin?: Database["public"]["Enums"]["content_origin"]
          content_rating?: Database["public"]["Enums"]["content_rating"]
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          genres?: string[] | null
          id?: string
          review_status?: string
          status?: Database["public"]["Enums"]["story_status"]
          tags?: string[] | null
          title: string
          type: Database["public"]["Enums"]["story_type"]
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_name?: string | null
          average_rating?: number | null
          content_origin?: Database["public"]["Enums"]["content_origin"]
          content_rating?: Database["public"]["Enums"]["content_rating"]
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          genres?: string[] | null
          id?: string
          review_status?: string
          status?: Database["public"]["Enums"]["story_status"]
          tags?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["story_type"]
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      story_relationships: {
        Row: {
          created_at: string
          id: string
          relationship: Database["public"]["Enums"]["relationship_type"]
          source_story_id: string
          target_story_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          relationship: Database["public"]["Enums"]["relationship_type"]
          source_story_id: string
          target_story_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relationship?: Database["public"]["Enums"]["relationship_type"]
          source_story_id?: string
          target_story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_relationships_source_story_id_fkey"
            columns: ["source_story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_relationships_target_story_id_fkey"
            columns: ["target_story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          ip_address: string
          story_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          ip_address: string
          story_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          ip_address?: string
          story_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_2fa_secrets: {
        Row: {
          backup_codes: string[]
          created_at: string
          id: string
          is_enabled: boolean | null
          secret: string
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[]
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          secret: string
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: string[]
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          secret?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          banned_at: string
          banned_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          notes: string | null
          reason: string
          user_id: string
        }
        Insert: {
          banned_at?: string
          banned_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          reason: string
          user_id: string
        }
        Update: {
          banned_at?: string
          banned_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          id: string
          user_id: string
          story_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          story_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          story_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lists: {
        Row: {
          created_at: string
          id: string
          list: Database["public"]["Enums"]["list_type"]
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list: Database["public"]["Enums"]["list_type"]
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list?: Database["public"]["Enums"]["list_type"]
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lists_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          id: string
          last_chapter_id: string | null
          last_episode_id: string | null
          story_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_chapter_id?: string | null
          last_episode_id?: string | null
          story_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_chapter_id?: string | null
          last_episode_id?: string | null
          story_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_last_chapter_id_fkey"
            columns: ["last_chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_last_episode_id_fkey"
            columns: ["last_episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      story_ratings_summary: {
        Row: {
          average_rating: number | null
          max_rating: number | null
          min_rating: number | null
          rating_count: number | null
          story_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_helpful_count: {
        Args: { review_id: string }
        Returns: undefined
      }
      increment_story_view_count: {
        Args: { story_id_input: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_creator: { Args: { _user_id: string }; Returns: boolean }
      is_moderator: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "creator"
      content_origin: "original" | "fanfiction"
      content_rating: "safe" | "suggestive" | "mature" | "explicit"
      list_type: "reading" | "completed" | "plan_to_read"
      relationship_type:
        | "adapts"
        | "sequel"
        | "prequel"
        | "spinoff"
        | "alternative"
      report_status: "pending" | "reviewing" | "resolved" | "dismissed"
      report_type: "content" | "user" | "dmca"
      story_status: "ongoing" | "completed" | "hiatus"
      story_type:
        | "novel"
        | "manga"
        | "comic"
        | "anime"
        | "cartoon"
        | "audiobook"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "creator"],
      content_origin: ["original", "fanfiction"],
      content_rating: ["safe", "suggestive", "mature", "explicit"],
      list_type: ["reading", "completed", "plan_to_read"],
      relationship_type: [
        "adapts",
        "sequel",
        "prequel",
        "spinoff",
        "alternative",
      ],
      report_status: ["pending", "reviewing", "resolved", "dismissed"],
      report_type: ["content", "user", "dmca"],
      story_status: ["ongoing", "completed", "hiatus"],
      story_type: ["novel", "manga", "comic", "anime", "cartoon", "audiobook"],
    },
  },
} as const

