import type { Metadata } from "next";
import { Familjen_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const body = Familjen_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gambit",
  description: "Xadrez em 3D no navegador, com salas e regras criadas por você.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={body.variable}>
      <body>{children}</body>
    </html>
  );
}
