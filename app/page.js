'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const INGEST_URL = process.env.NEXT_PUBLIC_INGEST_API_URL;

function getOrCreateSessionId() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('session_id');
  if (fromQuery) return fromQuery;

  const storageKey = 'race_session_id';
  let id = window.sessionStorage.getItem(storageKey);
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, id);
  }
  return id;
}

export default function ControllerPage() {
  const [sessionId, setSessionId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [nameLocked, setNameLocked] = useState(false);
  const [pulse, setPulse] = useState(false);
  const pulseTimeout = useRef(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  const sendTap = useCallback(() => {
    if (!sessionId || !INGEST_URL) return;
    fetch(`${INGEST_URL}/tap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        player_name: playerName || undefined,
        event_type: 'tap',
        client_ts: new Date().toISOString(),
      }),
      keepalive: true,
    }).catch(() => {
      // Rate-limit (429) and network blips are both ignored on purpose —
      // the visitor should never see an error state mid-tap.
    });
  }, [sessionId, playerName]);

  const handleTap = () => {
    sendTap();
    setPulse(true);
    clearTimeout(pulseTimeout.current);
    // Short, fixed-length pulse so rapid tapping still reads as continuous
    // feedback instead of the button visually "sticking".
    pulseTimeout.current = setTimeout(() => setPulse(false), 80);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-between bg-slate-950 text-white px-6 py-8">
      <div className="w-full max-w-sm">
        {!nameLocked ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-400" htmlFor="player-name">
              Name / company (optional)
            </label>
            <div className="flex gap-2">
              <input
                id="player-name"
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g. Alex @ Acme"
                className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={() => setNameLocked(true)}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold"
              >
                Go
              </button>
            </div>
            <button onClick={() => setNameLocked(true)} className="self-start text-xs text-slate-500 underline">
              skip
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-slate-400">
            {playerName ? `Racing as ${playerName}` : 'Racing anonymously'}
          </p>
        )}
      </div>

      <button
        onClick={handleTap}
        disabled={!nameLocked}
        aria-label="Tap to accelerate"
        className={`select-none rounded-full h-64 w-64 max-h-[60vw] max-w-[60vw] text-3xl font-bold uppercase tracking-wide shadow-2xl transition-transform duration-75 active:scale-95 disabled:opacity-40 ${
          pulse ? 'scale-95 bg-orange-400' : 'bg-orange-500'
        }`}
      >
        Tap!
      </button>

      <p className="text-xs text-slate-600">session {sessionId ? sessionId.slice(0, 8) : '…'}</p>
    </main>
  );
}
