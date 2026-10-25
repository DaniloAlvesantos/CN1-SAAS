import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-primary",
  subsets: ["latin"],
});

export const metadata = {
  title: "Grupo D | CNI - SAAS",
  description: "Sistema de Análise de Dados para o Grupo D da CNI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jetBrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
