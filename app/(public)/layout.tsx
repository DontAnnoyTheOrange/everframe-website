import LoadingScreen from "@/components/LoadingScreen";
import SiteFooter from "@/components/public/SiteFooter";
import SiteNav from "@/components/public/SiteNav";
import { getCatalog } from "@/lib/data/catalog";
import { getSiteSettings } from "@/lib/data/settings";

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, catalog] = await Promise.all([
    getSiteSettings(),
    getCatalog(),
  ]);
  return (
    <>
      <LoadingScreen />
      <SiteNav messenger={settings.messengerHref} />
      {children}
      <SiteFooter
        settings={settings}
        homeBase={catalog?.homeBase ?? "Dasmariñas, Cavite"}
      />
    </>
  );
}