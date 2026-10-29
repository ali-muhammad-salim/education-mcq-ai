import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MCQs AI | Premium Student Dashboard & Resource Hub",
  description: "Access curated past papers, study notes, structured syllabus trees, and interactive MCQs to achieve great marks in your exams. Specifically targeting the 2026 syllabus.",
  keywords: "MCQs, exam preparation, past papers, syllabus 2026, study notes, student dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
