import LoadingScreen from "@/components/LoadingScreen";
import PageTransition from "@/components/public/PageTransition";
import SiteMotion from "@/components/public/SiteMotion";
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
      <a
        href="#content-start"
        className="bg-brass text-brass-ink fixed top-3 left-3 z-[110] -translate-y-20 rounded-md px-4 py-2 text-sm font-medium focus:translate-y-0"
      >
        Skip to main content
      </a>
      <LoadingScreen />
      <SiteMotion />
      <PageTransition />
      <SiteNav />
      <div id="content-start" tabIndex={-1} className="outline-none" />
      {children}
      <SiteFooter
        settings={settings}
        homeBase={catalog?.homeBase ?? "Dasmariñas, Cavite"}
      />
    </>
  );
}                                                                                                                                                                                     