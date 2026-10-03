import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gorge Capital Intelligence — CRGNSA Land & Valuation Analytics",
  description:
    "Regulatory land-supply scarcity, urban growth boundaries, micro-market pricing, and 20-year compound valuation projections across the Columbia River Gorge National Scenic Area's 11 urban enclaves.",
  keywords: [
    "Columbia River Gorge",
    "CRGNSA",
    "real estate analytics",
    "land supply",
    "urban growth boundary",
    "Hood River",
    "The Dalles",
    "White Salmon",
    "Dallesport",
    "compound appreciation",
  ],
  authors: [{ name: "Gorge Capital Intelligence" }],
  openGraph: {
    title: "Gorge Capital Intelligence",
    description:
      "Statutory land scarcity, priced in decades — CRGNSA corridor analytics.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
