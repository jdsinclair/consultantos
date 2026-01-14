import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "ConsultantOS - Your AI-Powered Consulting Co-Pilot",
  description:
    "Transform your consulting practice with AI. Real-time session assistance, automatic action item detection, client knowledge management, and personalized AI personas. Built for startup consultants.",
  keywords: [
    "consulting software",
    "AI assistant",
    "consulting tools",
    "client management",
    "meeting assistant",
    "action items",
    "consulting frameworks",
    "startup consulting",
  ],
  authors: [{ name: "ConsultantOS" }],
  creator: "ConsultantOS",
  publisher: "ConsultantOS",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://consultantos.com",
    siteName: "ConsultantOS",
    title: "ConsultantOS - Your AI-Powered Consulting Co-Pilot",
    description:
      "Transform your consulting practice with AI. Real-time session assistance, automatic action item detection, and client knowledge management.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ConsultantOS - AI-Powered Consulting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ConsultantOS - Your AI-Powered Consulting Co-Pilot",
    description:
      "Transform your consulting practice with AI. Real-time session assistance and client knowledge management.",
    images: ["/og-image.png"],
    creator: "@consultantos",
  },
  alternates: {
    canonical: "https://consultantos.com",
  },
};

// JSON-LD Schema
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ConsultantOS",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI-powered consulting co-pilot for real-time session assistance, client management, and knowledge organization.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "127",
  },
  featureList: [
    "Real-time session transcription",
    "AI-powered suggestions during calls",
    "Automatic action item detection",
    "Client knowledge management",
    "Custom consulting frameworks",
    "Multiple AI personas",
  ],
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ConsultantOS",
  url: "https://consultantos.com",
  logo: "https://consultantos.com/logo.png",
  sameAs: [
    "https://twitter.com/consultantos",
    "https://linkedin.com/company/consultantos",
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <LandingPage />
    </>
  );
}
