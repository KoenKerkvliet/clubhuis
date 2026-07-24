// Handmatig geschreven, gebaseerd op supabase/migrations/0001_init.sql.
// Zodra de migratie via de Supabase MCP-connector is toegepast: vervang dit bestand door
// het gegenereerde resultaat van `generate_typescript_types` voor 1-op-1 synchroniciteit.

export type ProfileRole = 'kind' | 'ouder' | 'beheerder'
export type ProfileStatus = 'pending' | 'active' | 'rejected' | 'blocked'
export type StoryVisibility = 'private' | 'friends'
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          role: ProfileRole
          status: ProfileStatus
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        // Wordt aangemaakt via handle_new_user() trigger bij registratie, niet via client-insert.
        Insert: {
          id: string
          username: string
          display_name: string
          role?: ProfileRole
          status?: ProfileStatus
          avatar_url?: string | null
        }
        Update: Partial<{
          display_name: string
          avatar_url: string | null
        }>
        Relationships: []
      }
      profile_questions: {
        Row: {
          id: string
          key: string
          label: string
          sort_order: number
          active: boolean
        }
        Insert: {
          id?: string
          key: string
          label: string
          sort_order?: number
          active?: boolean
        }
        Update: Partial<{
          key: string
          label: string
          sort_order: number
          active: boolean
        }>
        Relationships: []
      }
      profile_answers: {
        Row: {
          profile_id: string
          question_id: string
          answer: string
          updated_at: string
        }
        Insert: {
          profile_id: string
          question_id: string
          answer: string
        }
        Update: Partial<{ answer: string }>
        Relationships: []
      }
      friendships: {
        Row: {
          id: string
          requester_id: string
          addressee_id: string
          status: FriendshipStatus
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          requester_id: string
          addressee_id: string
          status?: FriendshipStatus
        }
        Update: Partial<{ status: FriendshipStatus; responded_at: string }>
        Relationships: []
      }
      stories: {
        Row: {
          id: string
          author_id: string
          text: string
          photo_path: string | null
          visibility: StoryVisibility
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          text: string
          photo_path?: string | null
          visibility: StoryVisibility
        }
        Update: Partial<{ text: string; visibility: StoryVisibility }>
        Relationships: []
      }
      story_aura: {
        Row: {
          story_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          story_id: string
          user_id: string
        }
        Update: Partial<{ story_id: string; user_id: string }>
        Relationships: []
      }
      story_comments: {
        Row: {
          id: string
          story_id: string
          author_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          story_id: string
          author_id: string
          text: string
        }
        Update: Partial<{ text: string }>
        Relationships: []
      }
      scribbles: {
        Row: {
          id: string
          profile_id: string
          author_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          author_id: string
          text: string
        }
        Update: Partial<{ text: string }>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          payload: Record<string, unknown>
          read: boolean
          created_at: string
        }
        // Wordt geschreven door de notify()-functie server-side, niet via client-insert.
        Insert: {
          id?: string
          user_id: string
          type: string
          payload?: Record<string, unknown>
          read?: boolean
        }
        Update: Partial<{ read: boolean }>
        Relationships: []
      }
    }
    Views: {
      profile_cards: {
        Row: {
          id: string
          username: string
          display_name: string
          avatar_url: string | null
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
