import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "ConsultantOS - AI Software for Coaches & Solo Consultants",
  description:
    "The operating system for independent coaches and solo consultants who do the work themselves. Real-time AI assistance during client sessions, automatic action item tracking, and client knowledge management. Built for operators, not delegators.",
  keywords: [
    // Primary - coaching focus (less competitive)
    "coaching software",
    "coach management software",
    "business coaching tools",
    "executive coaching software",
    "coaching practice management",
    "coaching session software",
    // Secondary - solo consultant focus
    "solo consultant software",
    "independent consultant tools",
    "freelance consultant software",
    "consultant productivity software",
    // Features
    "AI coaching assistant",
    "client session recording",
    "meeting transcription for coaches",
    "action item tracking",
    "client management for coaches",
    "coaching frameworks",
    "strategy consulting tools",
    // Long-tail
    "solopreneur consulting software",
    "one person consulting firm software",
    "boutique consulting tools",
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
    title: "ConsultantOS - AI Software for Coaches & Solo Consultants",
    description:
      "Built for independent coaches and solo consultants who do the work themselves. Real-time AI assistance, automatic action tracking, and client knowledge management.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ConsultantOS - AI-Powered Software for Coaches",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ConsultantOS - AI Software for Coaches & Solo Consultants",
    description:
      "Built for coaches and solo consultants who do the work themselves. Real-time AI assistance and client knowledge management.",
    images: ["/og-image.png"],
    creator: "@consultantos",
  },
  alternates: {
    canonical: "https://consultantos.com",
  },
};

// JSON-LD Software Application Schema
const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ConsultantOS",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Coaching Software",
  operatingSystem: "Web",
  description:
    "AI-powered software for independent coaches and solo consultants. Features real-time session assistance, automatic action item detection, client knowledge management, and custom AI personas.",
  url: "https://consultantos.com",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "0",
    highPrice: "499",
    priceCurrency: "USD",
    offerCount: "3",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "127",
    bestRating: "5",
  },
  featureList: [
    "Real-time session transcription",
    "AI-powered suggestions during client calls",
    "Automatic action item detection",
    "Client knowledge base management",
    "Custom coaching frameworks",
    "Multiple AI personas",
    "Client portal sharing",
    "Email integration",
  ],
  screenshot: "https://consultantos.com/og-image.png",
};

// JSON-LD Organization Schema
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ConsultantOS",
  url: "https://consultantos.com",
  logo: "https://consultantos.com/logo.png",
  description: "AI software for coaches and solo consultants who do the work themselves.",
  sameAs: [
    "https://twitter.com/consultantos",
    "https://linkedin.com/company/consultantos",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    url: "https://consultantos.com",
  },
};

// JSON-LD FAQ Schema
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is ConsultantOS?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ConsultantOS is an AI-powered operating system designed specifically for independent coaches and solo consultants. It provides real-time AI assistance during client sessions, automatically tracks action items and commitments, maintains a knowledge base for each client, and helps you deliver more value without hiring a team.",
      },
    },
    {
      "@type": "Question",
      name: "Who is ConsultantOS built for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ConsultantOS is built for solo consultants and independent coaches who do the work themselves—not firms that delegate. Whether you're an executive coach, business consultant, strategy advisor, or any professional who runs client sessions independently, ConsultantOS helps you operate at a higher level without additional staff.",
      },
    },
    {
      "@type": "Question",
      name: "How does the AI assistance work during sessions?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "During client sessions, ConsultantOS transcribes the conversation in real-time and provides AI-powered suggestions. The AI detects action items as they're mentioned, suggests relevant questions based on the context, surfaces insights from previous sessions, and helps you stay fully engaged while never missing a commitment.",
      },
    },
    {
      "@type": "Question",
      name: "What are AI personas in ConsultantOS?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AI personas are specialized modes that adapt the AI's suggestions to your current context. Switch between Strategy Advisor, Sales Coach, Executive Coach, or create custom personas for your specific practice. Each persona provides contextually relevant prompts and insights.",
      },
    },
    {
      "@type": "Question",
      name: "Can I share plans and progress with clients?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! ConsultantOS includes a client portal feature that lets you share plans, strategies, and progress updates directly with clients. You control exactly what's visible, and clients see a beautiful, branded view that updates in real-time as you make changes.",
      },
    },
    {
      "@type": "Question",
      name: "How is client data kept secure?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ConsultantOS takes security seriously. All data is encrypted in transit and at rest. Each client's data is completely isolated. We never train AI models on your client data, and you maintain full ownership and control of all information stored in the platform.",
      },
    },
    {
      "@type": "Question",
      name: "Does ConsultantOS work with my existing tools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ConsultantOS integrates with your email (for tracking client communications), supports document uploads (PDFs, presentations, spreadsheets), can index client websites, and works alongside your existing calendar and meeting tools.",
      },
    },
    {
      "@type": "Question",
      name: "What is the Clarity Method™?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Clarity Method™ is a built-in strategic diagnosis framework that helps you guide clients from confusion to clarity. It includes structured canvases for defining strategic truth, setting north star constraints, identifying what to kill, mapping risks, and creating execution swimlanes.",
      },
    },
    {
      "@type": "Question",
      name: "What is Do The Thing™?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Do The Thing™ is an execution planning tool within ConsultantOS. It helps you turn strategy into action by creating structured plans with objectives, success metrics, and trackable initiatives. AI assists by suggesting tasks, tracking progress, and keeping plans aligned with client goals.",
      },
    },
    {
      "@type": "Question",
      name: "How much does ConsultantOS cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ConsultantOS offers three tiers: Starter (free) with 3 clients and 10 sessions/month, Pro ($499/month) with unlimited clients, sessions, and priority AI processing, and Enterprise (starting at $4,999/month) with dedicated infrastructure, custom integrations, and low-latency AI responses.",
      },
    },
  ],
};

// JSON-LD WebPage Schema with breadcrumbs
const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "ConsultantOS - AI Software for Coaches & Solo Consultants",
  description: "The operating system for independent coaches and solo consultants who do the work themselves.",
  url: "https://consultantos.com",
  isPartOf: {
    "@type": "WebSite",
    name: "ConsultantOS",
    url: "https://consultantos.com",
  },
  about: {
    "@type": "Thing",
    name: "Coaching and Consulting Software",
  },
  audience: {
    "@type": "Audience",
    audienceType: "Solo Consultants, Independent Coaches, Business Coaches, Executive Coaches, Strategy Consultants",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <LandingPage />
    </>
  );
}
