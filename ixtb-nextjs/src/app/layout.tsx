import { Toaster } from "@/src/components/ui/sonner.tsx";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import type { Metadata } from "next";
import { DM_Sans, Source_Code_Pro, Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { GlobalStateProvider } from "../components/contexts/global-state-context";
import { ErrorBoundary } from "../components/internal/error-boundary";
import { SidebarProvider } from "../components/ui/sidebar";
import "./globals.css";
import { cn } from "@/src/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className={`${inter.variable} ${mono.variable} antialiased`}>
        <NextTopLoader
          color="var(--primary)"
          height={2}
          showSpinner={false}
          shadow={false}
        />
        <ErrorBoundary name="RootLayout">
          <GlobalStateProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </GlobalStateProvider>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
