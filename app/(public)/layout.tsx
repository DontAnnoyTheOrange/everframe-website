import LoadingScreen from "@/components/LoadingScreen";
import SiteNav from "@/components/public/SiteNav";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <LoadingScreen />
      <SiteNav />
      {children}
    </>
  );
}
