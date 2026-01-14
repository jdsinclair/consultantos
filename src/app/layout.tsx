import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ConsultantOS",
  description: "Your AI-powered consulting co-pilot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#3b82f6",
          colorBackground: "#0a0a0a",
          colorInputBackground: "#171717",
          colorText: "#fafafa",
          colorTextSecondary: "#a1a1aa",
        },
        elements: {
          formButtonPrimary: "bg-blue-500 hover:bg-blue-600",
          card: "bg-neutral-900 border-neutral-800",
          headerTitle: "text-white",
          headerSubtitle: "text-neutral-400",
          formFieldLabel: "text-neutral-300",
          formFieldInput: "bg-neutral-800 border-neutral-700 text-white",
          footerActionLink: "text-blue-400 hover:text-blue-300",
        },
      }}
    >
      <html lang="en" className="dark">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
