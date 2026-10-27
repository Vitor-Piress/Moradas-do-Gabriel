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
      accommodations: {
        Row: {
          beds: Json
          cover_image: string
          created_at: string
          extra_amenities: Json
          full_description: string
          gallery: Json
          has_ac: boolean
          has_balcony: boolean
          has_bed_bath_linen: boolean
          has_kitchen: boolean
          has_kitchen_utensils: boolean
          has_private_bathroom: boolean
          has_tv: boolean
          has_wifi: boolean
          id: string
          is_active: boolean
          is_pet_friendly: boolean
          max_guests: number
          position: number
          short_description: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          beds?: Json
          cover_image?: string
          created_at?: string
          extra_amenities?: Json
          full_description?: string
          gallery?: Json
          has_ac?: boolean
          has_balcony?: boolean
          has_bed_bath_linen?: boolean
          has_kitchen?: boolean
          has_kitchen_utensils?: boolean
          has_private_bathroom?: boolean
          has_tv?: boolean
          has_wifi?: boolean
          id?: string
          is_active?: boolean
          is_pet_friendly?: boolean
          max_guests?: number
          position?: number
          short_description?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          beds?: Json
          cover_image?: string
          created_at?: string
          extra_amenities?: Json
          full_description?: string
          gallery?: Json
          has_ac?: boolean
          has_balcony?: boolean
          has_bed_bath_linen?: boolean
          has_kitchen?: boolean
          has_kitchen_utensils?: boolean
          has_private_bathroom?: boolean
          has_tv?: boolean
          has_wifi?: boolean
          id?: string
          is_active?: boolean
          is_pet_friendly?: boolean
          max_guests?: number
          position?: number
          short_description?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_target: string | null
          event_type: string
          id: string
          link_id: string | null
        }
        Insert: {
          created_at?: string
          event_target?: string | null
          event_type: string
          id?: string
          link_id?: string | null
        }
        Update: {
          created_at?: string
          event_target?: string | null
          event_type?: string
          id?: string
          link_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      business_info: {
        Row: {
          content: string
          id: string
          metadata: Json | null
          tab_title: string
          updated_at: string
        }
        Insert: {
          content?: string
          id?: string
          metadata?: Json | null
          tab_title?: string
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          metadata?: Json | null
          tab_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      links: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          position: number | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          position?: number | null
          title: string
          url: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          position?: number | null
          title?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

// ============================================================================
// Interfaces Complementares para o JSONB `metadata` da tabela `business_info`
// ============================================================================

export interface WifiMetadata {
  ssid: string
  password: string
}

export interface WifiNetwork {
  id?: string
  label?: string
  ssid: string
  password: string
}

export interface LocationMetadata {
  address: string
  maps_url: string
  waze_url: string
  embed_url: string
  instructions: string
}

export type PlaceCategory =
  | "Gastronomia"
  | "Praias"
  | "Passeios"
  | "Mercados"
  | string

export interface PlaceTip {
  name: string
  category: PlaceCategory
  description: string
  link: string
  embed_url?: string
  image_url?: string
  images?: string[]
}

export interface ContactsMetadata {
  whatsapp: string
  phone: string
  instagram: string
}

export interface HeroSlideItem {
  id: string
  topic: "Acomodações" | "Destinos" | "Praias" | "Sobre a Pousada" | string
  title: string
  subtitle: string
  image_url: string
  cta_label: string
  cta_href: string
}

export interface AboutHighlightItem {
  title: string
  description: string
  badge: string
}

export interface LandingAboutMetadata {
  badge: string
  title: string
  description: string
  secondary_description: string
  image_url: string
  highlights: AboutHighlightItem[]
}

export interface LandingFooterMetadata {
  company_name: string
  cnpj: string
  check_in_out_info: string
  copyright_note: string
}

export interface LandingPageMetadata {
  hero_slides: HeroSlideItem[]
  about: LandingAboutMetadata
  footer: LandingFooterMetadata
}

export interface BusinessInfoMetadata {
  wifi_networks: WifiNetwork[]
  wifi?: WifiMetadata
  location: LocationMetadata
  rules: string[]
  places_tips: PlaceTip[]
  contacts: ContactsMetadata
  landing?: LandingPageMetadata
}

export interface BedConfigItem {
  count: number
  type: string
}

export type AccommodationRow = Tables<"accommodations">
export type AccommodationInsert = TablesInsert<"accommodations">
export type AccommodationUpdate = TablesUpdate<"accommodations">

export interface TypedAccommodation
  extends Omit<AccommodationRow, "beds" | "gallery" | "extra_amenities"> {
  beds: BedConfigItem[]
  gallery: string[]
  extra_amenities: string[]
}

export type LinkRow = Tables<"links">
export type LinkInsert = TablesInsert<"links">
export type LinkUpdate = TablesUpdate<"links">

export type BusinessInfoRow = Tables<"business_info">
export type BusinessInfoInsert = TablesInsert<"business_info">
export type BusinessInfoUpdate = TablesUpdate<"business_info">

export interface TypedBusinessInfo extends Omit<BusinessInfoRow, "metadata"> {
  metadata: BusinessInfoMetadata
}

export type AnalyticsEventRow = Tables<"analytics_events">
export type AnalyticsEventInsert = TablesInsert<"analytics_events">
export type AnalyticsEventType = "page_view" | "link_click" | "guide_interaction"

