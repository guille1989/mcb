import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Mother Coffee Baby",
  description: "Cafe colombiano de especialidad",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
