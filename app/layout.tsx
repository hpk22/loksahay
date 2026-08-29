import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/i18n-provider";
import { LanguageGate } from "@/components/language-gate";
import { Assistant } from "@/components/assistant";

/*
  The portal this replaces is set in Source Sans Pro at 14px, which is a hard
  read for the people who need it most. Plus Jakarta Sans carries the headings
  because its open apertures and tall x-height stay legible when someone
  enlarges the page, and Inter carries body text and numbers for the same
  reason. Devanagari is set in Noto so Hindi and Marathi sit level with the
  Latin rather than looking pasted in.
*/

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const ui = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

const deva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-deva",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Loksahay | Public Grievance Assistance",
  description:
    "Describe your problem once, in any of thirteen Indian languages, by typing or by speaking. Loksahay identifies the right Ministry or Department, writes the grievance in the form the office expects, and tracks it against the published timeline.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6b0f3a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      data-script="latin"
      className={display.variable + " " + ui.variable + " " + deva.variable}
    >
      <body>
        <LanguageProvider>
          <LanguageGate />
          {children}
          {/* Floating help, on every route except the ones that run their own mic. */}
          <Assistant />
        </LanguageProvider>
      </body>
    </html>
  );
}
