import './globals.css';

export const metadata = {
  title: 'Live Race — Tap to Accelerate',
  description: 'Tap the button to accelerate your vehicle in the live race.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
