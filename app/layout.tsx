import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Everframe Productions",
    template: "%s | Everframe Productions",
  },
  description:
    "Photography and videography for weddings, debuts, corporate events and concerts in the Philippines.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        {/* Runs before the page paints: marks visitors who already saw the intro this session. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(sessionStorage.getItem("everframe-intro-seen")==="1")document.documentElement.setAttribute("data-ef-seen","")}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}