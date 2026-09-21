'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const INGEST_URL = process.env.NEXT_PUBLIC_INGEST_API_URL;

// Mirrors stream-processor's game constants (race-backend/stream-processor/src/game.js)
// so the rev dial feels like the player's real speed without needing a live
// connection back from the backend just to show your own number.
const TAP_SPEED_INCREMENT = 5;
const MAX_SPEED = 100;
const DECAY_PER_MS = 1 / 200;
const DECAY_TICK_MS = 100;

const TICK_COUNT = 12;
const ARC_DEGREES = 300; // leaves a 60-degree gap at the bottom, like a speedometer
const START_ANGLE = -150;

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

function RevDial({ speed, pressed, disabled, onTap }) {
  const litTicks = Math.round((speed / MAX_SPEED) * TICK_COUNT);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ '--ring': 'clamp(220px, 72vw, 300px)', width: 'var(--ring)', height: 'var(--ring)' }}
    >
      {Array.from({ length: TICK_COUNT }).map((_, i) => {
        const angle = START_ANGLE + i * (ARC_DEGREES / (TICK_COUNT - 1));
        const lit = i < litTicks;
        return (
          <div
            key={i}
            aria-hidden="true"
            className={`absolute rounded-full ${lit ? 'bg-amber-400' : 'bg-slate-700'}`}
            style={{
              width: 'calc(var(--ring) * 0.025)',
              height: 'calc(var(--ring) * 0.06)',
              top: '50%',
              left: '50%',
              marginLeft: 'calc(var(--ring) * -0.0125)',
              marginTop: 'calc(var(--ring) * -0.03)',
              transform: `rotate(${angle}deg) translateY(calc(var(--ring) * -0.46))`,
            }}
          />
        );
      })}

      <button
        onClick={onTap}
        disabled={disabled}
        aria-label="Tap to rev"
        className="absolute select-none rounded-full flex flex-col items-center justify-center gap-1 shadow-2xl transition-[background-color] duration-75 disabled:opacity-40 bg-orange-500"
        style={{
          width: 'calc(var(--ring) * 0.74)',
          height: 'calc(var(--ring) * 0.74)',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${pressed ? 0.92 : 1})`,
          backgroundColor: pressed ? '#fb923c' : undefined,
        }}
      >
        <span className="text-2xl font-bold uppercase tracking-wide text-white">Rev</span>
        <span className="font-mono text-lg text-orange-100">{Math.round(speed)}</span>
      </button>
    </div>
  );
}

export default function ControllerPage() {
  const [sessionId, setSessionId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [nameLocked, setNameLocked] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [speed, setSpeed] = useState(0);
  const pressTimeout = useRef(null);
  const lastDecayAt = useRef(Date.now());

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  // Local-only decay loop so the dial reflects the same friction the backend
  // applies, purely for visual feel — the real speed lives server-side.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastDecayAt.current;
      lastDecayAt.current = now;
      setSpeed((s) => Math.max(0, s - DECAY_PER_MS * elapsed));
    }, DECAY_TICK_MS);
    return () => clearInterval(id);
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
    lastDecayAt.current = Date.now();
    setSpeed((s) => Math.min(MAX_SPEED, s + TAP_SPEED_INCREMENT));
    setPressed(true);
    clearTimeout(pressTimeout.current);
    pressTimeout.current = setTimeout(() => setPressed(false), 80);
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

      <RevDial speed={speed} pressed={pressed} disabled={!nameLocked} onTap={handleTap} />

      <p className="text-xs text-slate-600">session {sessionId ? sessionId.slice(0, 8) : '…'}</p>
    </main>
  );
}
