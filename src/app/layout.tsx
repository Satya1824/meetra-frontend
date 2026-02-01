import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meetra - Video Conferencing with Real-Time Translation",
  description: "Break language barriers with auto-translating video calls. Speak in your language, everyone sees translations in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
