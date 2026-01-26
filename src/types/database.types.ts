export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          handle: string
          bio: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          handle: string
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          handle?: string
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
      likes: {
        Row: {
          id: number
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          post_id?: string
          created_at?: string
        }
      }
      follows: {
        Row: {
          id: number
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: number
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: number
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
    }
  }
}