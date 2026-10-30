// Row shapes used by the admin screens. Kept by hand to match supabase/migrations.
export type BookingRow = {
  id: string;
  reference_code: string;
  status: string;
  source: string;
  category_id: string;
  event_type_other: string | null;
  package_id: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_messenger: string | null;
  venue: string | null;
  venue_place_id: string | null;
  venue_lat: number | null;
  venue_lng: number | null;
  client_message: string | null;
  internal_notes: string | null;
  starts_at: string | null;
  ends_at: string | null;
  duration_hours: number | null;
  package_name_snapshot: string | null;
  package_price_snapshot: number | null;
  service_type_snapshot: string | null;
  extra_hours: number;
  extra_hours_fee: number;
  outside_base_area: boolean;
  travel_fee: number;
  addons_total: number;
  custom_quote: boolean;
  total_price: number | null;
  created_at: string;
};

export type BookingAddonRow = {
  id: string;
  name_snapshot: string;
  quantity: number;
  line_total: number;
};

export type HistoryRow = {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  note: string | null;
};

export const SOURCE_LABEL: Record<string, string> = {
  website: "Website",
  messenger: "Messenger",
  phone: "Phone",
  other: "Other",
};