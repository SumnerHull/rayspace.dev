import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/hooks/useTheme";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Ray Space - Sumner Hull",
  description: "Full-Stack Software Engineer passionate about building robust, efficient, and user-friendly web applications.",
  keywords: ["software engineer", "full-stack", "web development", "react", "rust"],
  authors: [{ name: "Sumner Hull" }],
  openGraph: {
    title: "Ray Space - Sumner Hull",
    description: "Full-Stack Software Engineer passionate about building robust, efficient, and user-friendly web applications.",
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
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider defaultTheme="system" storageKey="theme">
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
