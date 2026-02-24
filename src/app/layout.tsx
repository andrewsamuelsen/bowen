import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Bowen - Go deeper",
  description: "AI-Powered Relationship Synthesis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased font-sans">
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-BR42JG7C40"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-BR42JG7C40');
            `}
          </Script>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
