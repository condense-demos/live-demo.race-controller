'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Booth-operator page: displays a QR code pointing at this app's own base
// URL (no session_id — each visitor gets a fresh one client-side on /).
// Not meant for visitors; print this page or show it on a small screen next
// to the dashboard.
export default function QrPage() {
  const [url, setUrl] = useState('');

  useEffect(() => {
    setUrl(window.location.origin);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white">
      <h1 className="text-2xl font-bold text-slate-900">Scan to join the race</h1>
      {url && <QRCodeSVG value={url} size={320} includeMargin />}
      <p className="text-sm text-slate-500">{url}</p>
    </main>
  );
}
