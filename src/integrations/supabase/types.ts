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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          challenge_id: string
          files: Json
          hints_used: number
          id: string
          started_at: string
          status: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          files: Json
          hints_used?: number
          id?: string
          started_at?: string
          status?: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          files?: Json
          hints_used?: number
          id?: string
          started_at?: string
          status?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_hidden_tests: {
        Row: {
          challenge_id: string
          files: Json
        }
        Insert: {
          challenge_id: string
          files: Json
        }
        Update: {
          challenge_id?: string
          files?: Json
        }
        Relationships: [
          {
            foreignKeyName: "challenge_hidden_tests_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: true
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          acceptance: string[]
          category: string
          description: string
          difficulty: string
          est_minutes: number
          hints: string[]
          id: string
          slug: string
          sort_order: number
          starter_files: Json
          summary: string
          tags: string[]
          title: string
          visible_tests: Json
        }
        Insert: {
          acceptance?: string[]
          category: string
          description: string
          difficulty: string
          est_minutes?: number
          hints?: string[]
          id?: string
          slug: string
          sort_order?: number
          starter_files: Json
          summary: string
          tags?: string[]
          title: string
          visible_tests: Json
        }
        Update: {
          acceptance?: string[]
          category?: string
          description?: string
          difficulty?: string
          est_minutes?: number
          hints?: string[]
          id?: string
          slug?: string
          sort_order?: number
          starter_files?: Json
          summary?: string
          tags?: string[]
          title?: string
          visible_tests?: Json
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          company: string
          description: string
          id: string
          level: number
          location: string
          remote: boolean
          required: Json
          role_type: string
          salary_max: number
          salary_min: number
          title: string
          url: string
        }
        Insert: {
          company: string
          description: string
          id?: string
          level: number
          location: string
          remote?: boolean
          required?: Json
          role_type: string
          salary_max: number
          salary_min: number
          title: string
          url: string
        }
        Update: {
          company?: string
          description?: string
          id?: string
          level?: number
          location?: string
          remote?: boolean
          required?: Json
          role_type?: string
          salary_max?: number
          salary_min?: number
          title?: string
          url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          credits: number
          display_name: string | null
          id: string
          last_daily_claim: string | null
          region: string | null
        }
        Insert: {
          created_at?: string
          credits?: number
          display_name?: string | null
          id: string
          last_daily_claim?: string | null
          region?: string | null
        }
        Update: {
          created_at?: string
          credits?: number
          display_name?: string | null
          id?: string
          last_daily_claim?: string | null
          region?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          attempt_id: string
          challenge_id: string
          correctness: number
          created_at: string
          economy: number
          evidence: Json
          overall: number
          steering: number
          summary: string
          tests: Json
          tips: Json
          user_id: string
          verification: number
        }
        Insert: {
          attempt_id: string
          challenge_id: string
          correctness: number
          created_at?: string
          economy: number
          evidence?: Json
          overall: number
          steering: number
          summary: string
          tests?: Json
          tips?: Json
          user_id: string
          verification: number
        }
        Update: {
          attempt_id?: string
          challenge_id?: string
          correctness?: number
          created_at?: string
          economy?: number
          evidence?: Json
          overall?: number
          steering?: number
          summary?: string
          tests?: Json
          tips?: Json
          user_id?: string
          verification?: number
        }
        Relationships: [
          {
            foreignKeyName: "reports_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      session_events: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          payload: Json
          type: string
          user_id: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          payload?: Json
          type: string
          user_id: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          payload?: Json
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_events_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_daily_credits: { Args: never; Returns: number }
      set_region: { Args: { _region: string }; Returns: string }
      spend_credits: {
        Args: { _amount: number; _reason: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
