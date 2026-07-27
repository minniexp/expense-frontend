'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchTellerEnrollmentConfig } from '@/services/api';

/**
 * Teller Connect launcher.
 *
 * Two flows:
 *   - RECONNECT (update mode) — re-authorise the existing enrollment when the bank connection
 *     lapses. Keeps the same enrollment and the same access token, so nothing needs changing
 *     in the environment afterwards.
 *   - CONNECT A NEW BANK — create a fresh enrollment. This produces a NEW access token and
 *     enrollment id, which have to be written into the environment for the backend to use.
 *
 * IDENTIFIERS ARE NEVER DISPLAYED OR LOGGED.
 * The application id, enrollment id and access token identify the bank connection. They are
 * passed to Teller Connect because it requires them, but they are kept out of the UI, out of
 * `console.log`, and out of anything that could end up in a screenshot, a support thread, or a
 * server log. The one exception is a newly minted credential, which is useless unless the user
 * can copy it — that is shown once, behind an explicit reveal, and never logged.
 */
export default function TellerLink({ onSuccess: onSuccessProp, disabled }) {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState('Loading Teller configuration...');
  const [tellerLoaded, setTellerLoaded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null); // shown once after a new enrollment
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState(null); // 'update' | 'new'

  useEffect(() => {
    let alive = true;
    fetchTellerEnrollmentConfig()
      .then((cfg) => {
        if (!alive) return;
        setConfig(cfg);
        if (cfg.warnings && cfg.warnings.length) {
          setStatus(`Configuration problem: ${cfg.warnings[0]}`);
        } else if (!cfg.enrollmentId) {
          setStatus('No bank connected yet. Use “Connect a bank” to set one up.');
        } else {
          // Environment is safe to show and is the usual cause of Connect failing.
          // The enrollment id is deliberately not shown.
          setStatus(`Bank connected. Environment: ${cfg.environment}.`);
        }
      })
      .catch((e) => alive && setStatus(`Could not load Teller configuration: ${e.message}`));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof window.TellerConnect !== 'undefined') { setTellerLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.teller.io/connect/connect.js';
    script.async = true;
    script.onload = () => setTellerLoaded(true);
    document.body.appendChild(script);
  }, []);

  /** Hand the enrollment to the backend. The token is posted, never displayed en route. */
  const notifyBackend = useCallback(async (enrollment) => {
    const response = await fetch('/api/teller/enrollment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ accessToken: enrollment.accessToken, enrollment }),
    });
    if (!response.ok) throw new Error(`Backend rejected the enrollment (${response.status})`);
  }, []);

  /**
   * Open Teller Connect.
   *
   * @param {'update'|'new'} which  update mode reuses the existing enrollment; new creates one.
   */
  const open = useCallback((which) => {
    if (!tellerLoaded || typeof window.TellerConnect === 'undefined') {
      setStatus('Teller Connect is still loading — try again in a moment.');
      return;
    }
    if (!config || !config.applicationId) {
      setStatus('Teller is not configured on the server.');
      return;
    }
    if (which === 'update' && !config.enrollmentId) {
      setStatus('There is no existing connection to reconnect. Use “Connect a bank” instead.');
      return;
    }

    setMode(which);
    setNewCredentials(null);
    setRevealed(false);

    const options = {
      applicationId: config.applicationId,
      environment: config.environment,
      products: ['transactions'],
      // Supplying an enrollment id is what makes this update mode. Omitting it creates a new
      // enrollment — which is the entire difference between the two buttons.
      ...(which === 'update' ? { enrollmentId: config.enrollmentId } : {}),

      onSuccess: async (enrollment) => {
        const returnedId = enrollment.enrollment?.id;

        if (which === 'update') {
          if (returnedId && returnedId !== config.enrollmentId) {
            // A different id means Teller created a new connection rather than refreshing the
            // old one. Saving that token would quietly point the app at a second enrollment
            // while the environment still names the first.
            setStatus('Teller returned a different connection than the one we asked to '
              + 'refresh, so a new one was created rather than reconnected. Nothing was saved. '
              + 'Use “Connect a bank” deliberately if that is what you intended.');
            return;
          }
          setStatus('Reconnected. Verifying with the server…');
          try {
            await notifyBackend(enrollment);
            setIsConnected(true);
            setStatus('Reconnected successfully. Your existing access token still works — '
              + 'nothing to change. Try “Fetch Teller Transactions”.');
            if (onSuccessProp) onSuccessProp(enrollment);
          } catch (err) {
            setStatus(`Reconnected with Teller, but the server did not accept it: ${err.message}`);
          }
          return;
        }

        // New enrollment: the credentials only exist here, once.
        setStatus('Bank connected. A new access token was issued — see below.');
        try { await notifyBackend(enrollment); } catch { /* surfaced via the panel below */ }
        setNewCredentials({
          accessToken: enrollment.accessToken || '',
          enrollmentId: returnedId || '',
        });
        setIsConnected(true);
        if (onSuccessProp) onSuccessProp(enrollment);
      },

      onExit: () => setStatus((s) => (isConnected ? s : 'Teller Connect closed without finishing.')),
      onFailure: (failure) => {
        // Teller's own messages are the useful part; they name the actual misconfiguration.
        const detail = [failure?.type, failure?.code, failure?.message].filter(Boolean).join(' — ');
        setStatus(`Teller Connect failed${detail ? `: ${detail}` : '.'}`);
      },
    };

    window.TellerConnect.setup(options).open();
  }, [tellerLoaded, config, isConnected, notifyBackend, onSuccessProp]);

  const ready = tellerLoaded && config && config.applicationId && !disabled;
  const hasExisting = Boolean(config?.enrollmentId);

  const btn = 'px-4 py-3 rounded font-bold text-base transition-colors duration-200 ' +
    'disabled:bg-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed';

  return (
    <div className="my-4">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => open('update')}
          disabled={!ready || !hasExisting}
          title={hasExisting
            ? 'Re-authorise the existing bank connection. Keeps your current access token.'
            : 'No bank is connected yet.'}
          className={`${btn} bg-green-600 hover:bg-green-700 text-white`}
        >
          {isConnected && mode === 'update' ? 'Reconnected' : 'Reconnect Bank (Update Mode)'}
        </button>

        <button
          onClick={() => {
            if (hasExisting && !window.confirm(
              'A bank is already connected.\n\n'
              + 'This creates a SEPARATE new connection rather than refreshing the existing '
              + 'one, and issues a new access token you will have to put in your environment. '
              + 'If you are trying to fix a connection that stopped working, use '
              + '“Reconnect Bank” instead.\n\nCreate a new connection anyway?'
            )) return;
            open('new');
          }}
          disabled={!ready}
          title="Connect a bank for the first time. Issues a new access token."
          className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}
        >
          {isConnected && mode === 'new' ? 'Bank Connected' : 'Connect a Bank (New)'}
        </button>
      </div>

      {status && <p className="text-sm text-gray-400 mt-2 break-words">{status}</p>}

      {newCredentials && (
        <div className="mt-3 bg-amber-950/50 border border-amber-700 rounded p-3">
          <div className="font-bold text-amber-300">New connection created — save these now</div>
          <p className="text-xs text-amber-200/90 mt-1">
            Shown once and not stored anywhere in this app. Put them in the backend environment
            (locally in <code>.env</code>, and in the Vercel backend project), then restart.
            Treat the access token like a password: it reads your bank data.
          </p>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="mt-2 px-3 py-2 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold"
            >
              Reveal credentials
            </button>
          ) : (
            <div className="mt-2 grid gap-2">
              {[
                ['TELLER_ACCESS_TOKEN', newCredentials.accessToken],
                ['TELLER_ENROLLMENT_ID', newCredentials.enrollmentId],
              ].map(([key, value]) => (
                <div key={key}>
                  <div className="text-xs text-amber-200/80">{key}</div>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 min-w-0 bg-gray-900 rounded px-2 py-2 text-xs break-all">
                      {value || '(not returned)'}
                    </code>
                    <button
                      onClick={() => navigator.clipboard?.writeText(value || '')}
                      className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-xs shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => { setNewCredentials(null); setRevealed(false); }}
                className="text-xs text-amber-300 underline justify-self-start mt-1 py-1"
              >
                Done — hide these
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
