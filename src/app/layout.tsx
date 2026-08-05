import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Financial Lending Specialists — Financing Solutions Built Around Your Goals",
    template: "%s | Financial Lending Specialists",
  },
  description:
    "Financial Lending Specialists helps businesses, investors, and professionals explore financing options for opportunities that don't always fit neatly into traditional lending programs.",
  robots: {
    // Nothing is indexed until the content is verified and legal review is done
    // (BUSINESS_CONTEXT §12, platform spec §29). Flip this at launch.
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // data-scroll-behavior tells Next the smooth scrolling in globals.css is
  // intentional, so it doesn't warn on every route transition.
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-dvh antialiased">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
