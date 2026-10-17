import type { Metadata } from "next";
import "./globals.css";
import { RecoveryRedirect } from "@/components/auth/recovery-redirect";

export const metadata: Metadata = {
  // Canonical origin for resolving relative Open Graph / canonical URLs.
  // The apex flscapitaladvisors.com redirects here (configured in Vercel).
  metadataBase: new URL("https://www.flscapitaladvisors.com"),
  title: {
    default: "FLS Capital Advisors — Your Business. Your Capital.",
    template: "%s | FLS Capital Advisors",
  },
  description:
    "FLS Capital Advisors helps businesses, investors, and professionals explore financing options for opportunities that don't always fit neatly into traditional lending programs.",
  // Site-wide noindex was lifted at launch (10-17). Pages that must never be
  // indexed carry their own `robots` metadata: sign-in and the auth routes,
  // the prequal flow, create-account, and the portal and admin layouts.
  // app/robots.ts keeps crawlers out of those paths as well.
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
        {/*
          Supabase's default password-reset template drops people on the site
          root with the tokens in a URL fragment, which the server never sees.
          This catches that and forwards them to the reset form. Renders nothing
          and does nothing on any other page load.
        */}
        <RecoveryRedirect />
        {children}
      </body>
    </html>
  );
}
