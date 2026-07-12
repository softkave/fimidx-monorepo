import { Toaster } from "@/src/components/ui/sonner.tsx";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans, Source_Code_Pro } from "next/font/google";
import { GlobalStateProvider } from "../components/contexts/global-state-context";
import { SidebarProvider } from "../components/ui/sidebar";
import "./globals.css";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = Source_Code_Pro({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: kAppConstants.name,
  description: kAppConstants.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sans.variable} ${mono.variable} antialiased`}
      >
        <GlobalStateProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </GlobalStateProvider>
        <Toaster />
      </body>
    </html>
  );
}
