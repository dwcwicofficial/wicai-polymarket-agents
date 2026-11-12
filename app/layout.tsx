import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WICAI Polymarket Agents',
  description: 'Multi-agent AI system for Polymarket crypto trading',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}