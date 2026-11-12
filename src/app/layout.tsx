import type { Metadata } from "next";
import { plexSans, sourceSerif } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinFlow — Business Cash Flow Intelligence & Invoicing",
  description:
    "Cash flow forecasting, multi-currency invoicing, and working capital intelligence for SMEs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
