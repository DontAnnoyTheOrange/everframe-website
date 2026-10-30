// Shapes of the database rows and function results used by the public site.
// Kept by hand to match supabase/migrations; replace with generated types later.
export type ServiceType = "photo" | "video" | "photo_video";

export type PackageRow = {
  id: string;
  slug: string;
  service_type: ServiceType;
  name: string;
  price: number;
  max_hours: number | null; // null = whole event
  extra_hour_rate: number | null;
  // Longest booking this package accepts; longer moves to the next tier. null = no limit.
  upgrade_above_hours: number | null;
  inclusions: string[];
  sort_order: number;
};

export type AddonRow = {
  id: string;
  name: string;
  price: number;
  per_hour: boolean;
  sort_order: number;
};

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  short_story: string | null;
  sort_order: number;
  is_other: boolean; // the "Others" type: the customer types their own label
};

export type QuoteAddonLine = {
  id: string;
  name: string;
  unit_price: number;
  per_hour: boolean;
  quantity: number;
  included: boolean;
  line_total: number;
};

// Result of the database function quote_booking().
export type Quote = {
  package_id: string;
  package_name: string;
  service_type: ServiceType;
  hours: number;
  max_hours: number | null;
  upgrade_above_hours: number | null;
  base_price: number;
  extra_hours: number;
  extra_hours_fee: number;
  addons: QuoteAddonLine[];
  addons_total: number;
  outside_base_area: boolean;
  travel_fee: number;
  custom_quote: boolean;
  total: number | null;
};

export type Turnaround = Record<ServiceType, string>;

export type Catalog = {
  packages: PackageRow[];
  addons: AddonRow[];
  includedAddons: { package_id: string; addon_id: string }[];
  categories: CategoryRow[];
  transportFee: number;
  homeBase: string;
  turnaround: Turnaround;
};