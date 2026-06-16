import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WIP",
  description: "A living Work In Progress page for weekly 1:1s.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
