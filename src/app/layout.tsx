import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Labor Efficiency Calculator | unKAGEd Hospitality",
  description:
    "Compare scheduled, actual, and sold labor by day, daypart, and role.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
