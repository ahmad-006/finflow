import type { Metadata, Viewport } from "next";
import { instrumentSerif, jakartaSans, jetBrainsMono } from "./fonts";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const viewport: Viewport = {
  themeColor: "#0F3D2E",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FinFlow — Know your cash thirty days early | Cash Flow Intelligence & Invoicing",
    template: "%s | FinFlow",
  },
  description:
    "FinFlow connects unpaid invoices, multi-currency receivables, and client payment latency into a live 30-day cash runway—alerting SMEs before a liquidity shortfall hits.",
  applicationName: "FinFlow Treasury Systems",
  authors: [{ name: "FinFlow Engineering & Research" }],
  generator: "Next.js",
  keywords: [
    "cash flow forecasting",
    "SME treasury software",
    "invoicing SaaS",
    "accounts receivable intelligence",
    "multi-currency invoice ledger",
    "30 day cash runway",
    "cash gap alerts",
    "automated invoice reminders",
    "financial operations platform",
  ],
  referrer: "origin-when-cross-origin",
  creator: "FinFlow",
  publisher: "FinFlow Treasury Systems",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/finflow-favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/finflow-icon.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/finflow-favicon-64.png",
    apple: [
      { url: "/finflow-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "FinFlow — Know your cash thirty days early",
    description:
      "Predictive 30-day cash flow runway intelligence and multi-currency invoicing for growing SMEs. Eliminate cash flow surprises.",
    url: siteUrl,
    siteName: "FinFlow",
    images: [
      {
        url: "/finflow-logo-on-white.png",
        width: 2400,
        height: 550,
        alt: "FinFlow — Cash Flow Intelligence & Invoicing",
      },
      {
        url: "/finflow-icon.png",
        width: 1024,
        height: 1024,
        alt: "FinFlow Monogram Icon",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinFlow — Know your cash thirty days early",
    description:
      "Connect unpaid invoices, FX spot conversions, and client payment delays into a live 30-day cash runway.",
    images: ["/finflow-logo-on-white.png"],
    creator: "@finflowapp",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: "FinFlow",
        applicationCategory: "BusinessApplication, FinanceApplication",
        operatingSystem: "Web Browser",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        description:
          "Forward-looking liquid treasury forecasting, dynamic multi-currency invoicing, and real-time receivables synchronization for SMEs.",
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          ratingCount: "128",
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "FinFlow Treasury Systems",
        url: siteUrl,
        logo: `${siteUrl}/finflow-logo.png`,
      },
    ],
  };

  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${jakartaSans.variable} ${jetBrainsMono.variable} scroll-smooth`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-white text-gray-900 font-sans min-h-screen antialiased selection:bg-zinc-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
