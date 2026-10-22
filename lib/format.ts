import type { ServiceType } from "@/lib/types/db";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export const formatPeso = (n: number) => peso.format(n);

export const SERVICE_LABEL: Record<ServiceType, string> = {
  photo: "Photo",
  video: "Video",
  photo_video: "Photo + Video",
};

export const SERVICE_ORDER: ServiceType[] = ["photo", "video", "photo_video"];

export function hoursLabel(maxHours: number | null): string {
  if (maxHours === null) return "Whole event";
  return `Up to ${maxHours} ${maxHours === 1 ? "hour" : "hours"}`;
}