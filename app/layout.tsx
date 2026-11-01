import type { ReactNode } from 'react';
import '@runwayml/avatars-react/styles.css';
import './globals.css';

export const metadata = {
  title: 'Oracle EPM Assistant',
  description: 'Talk to an Oracle EPM assistant powered by Runway Characters.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
