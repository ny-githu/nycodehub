export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      broadcasts: {
        Row: {
          active: boolean
          created_at: string
          id: string
          message: string
          title: string
          video_url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          message?: string
          title: string
          video_url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          message?: string
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      course_videos: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number
          storage_path: string | null
          title: string
          topic: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          storage_path?: string | null
          title: string
          topic?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          storage_path?: string | null
          title?: string
          topic?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_videos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          image_url: string | null
          level: string
          slug: string
          summary: string | null
          title: string
          track: string | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          image_url?: string | null
          level?: string
          slug: string
          summary?: string | null
          title: string
          track?: string | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          image_url?: string | null
          level?: string
          slug?: string
          summary?: string | null
          title?: string
          track?: string | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          progress: number
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          progress?: number
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          id: string
          order_index: number
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          id?: string
          order_index?: number
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          id?: string
          order_index?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      momo_sms: {
        Row: {
          amount_rwf: number | null
          created_at: string
          id: string
          linked_request_id: string | null
          payer_name: string | null
          raw_text: string
          received_at: string
          sender: string | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount_rwf?: number | null
          created_at?: string
          id?: string
          linked_request_id?: string | null
          payer_name?: string | null
          raw_text: string
          received_at?: string
          sender?: string | null
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount_rwf?: number | null
          created_at?: string
          id?: string
          linked_request_id?: string | null
          payer_name?: string | null
          raw_text?: string
          received_at?: string
          sender?: string | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      nycoder_memory: {
        Row: {
          notes: string
          turns: number
          updated_at: string
          user_id: string
        }
        Insert: {
          notes?: string
          turns?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          notes?: string
          turns?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nycoder_settings: {
        Row: {
          id: number
          model_chain: string[]
          self_improve: boolean
          system_prompt: string
          temperature: number
          updated_at: string
        }
        Insert: {
          id?: number
          model_chain?: string[]
          self_improve?: boolean
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Update: {
          id?: number
          model_chain?: string[]
          self_improve?: boolean
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      nycoder_training: {
        Row: {
          active: boolean
          answer: string
          created_at: string
          id: string
          prompt: string
          tag: string
        }
        Insert: {
          active?: boolean
          answer: string
          created_at?: string
          id?: string
          prompt: string
          tag?: string
        }
        Update: {
          active?: boolean
          answer?: string
          created_at?: string
          id?: string
          prompt?: string
          tag?: string
        }
        Relationships: []
      }
      payment_plans: {
        Row: {
          active: boolean
          amount_rwf: number
          created_at: string
          duration_days: number
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_rwf: number
          created_at?: string
          duration_days: number
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_rwf?: number
          created_at?: string
          duration_days?: number
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount_rwf: number
          created_at: string
          id: string
          note: string | null
          plan_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount_rwf: number
          created_at?: string
          id?: string
          note?: string | null
          plan_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          amount_rwf?: number
          created_at?: string
          id?: string
          note?: string | null
          plan_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          id: number
          instructions: string
          mobile_code: string
          updated_at: string
        }
        Insert: {
          id?: number
          instructions?: string
          mobile_code?: string
          updated_at?: string
        }
        Update: {
          id?: number
          instructions?: string
          mobile_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          disabled: boolean
          display_name: string | null
          expires_at: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          disabled?: boolean
          display_name?: string | null
          expires_at?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          disabled?: boolean
          display_name?: string | null
          expires_at?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          content: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          slug: string
          title?: string
          updated_at?: string
        }
        Update: {
          content?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "instructor" | "learner"
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
      app_role: ["admin", "instructor", "learner"],
    },
  },
} as const
