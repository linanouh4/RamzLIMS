import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";

const fonts = {
  "--font-geist-sans": "Tahoma, Arial, sans-serif",
  "--font-geist-mono": "Consolas, 'Courier New', monospace",
} as CSSProperties;

export const metadata: Metadata = {
  title: "RamzLIMS",
  description: "Laboratory Information Management System",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar" className="h-full antialiased" style={fonts}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}