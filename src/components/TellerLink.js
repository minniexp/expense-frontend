'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchTellerEnrollmentConfig } from '@/services/api';

export default function TellerLink({ onSuccess: onSuccessProp, disabled }) {
  const [status, setStatus] = useState('Loading Teller Connect...');
  const [isConnected, setIsConnected] = useState(false);
  const [tellerLoaded, setTellerLoaded] = useState(false);
  const [tellerConnect, setTellerConnect] = useState(null);
  const [config, setConfig] = useState(null);
  const [enrollmentResult, setEnrollmentResult] = useState(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  // Reconnect is deliberately NOT gated on the deployment stage. A Teller enrollment stops
  // syncing periodically and must be re-authorised through Teller Connect; blocking that in
  // production meant the one action that fixes a stalled connection was unavailable in the one
  // place it matters.

  useEffect(() => {
    fetchTellerEnrollmentConfig()
      .then((cfg) => {
        setConfig(cfg);
        if (!cfg.enrollmentId) {
          setStatus(
            'Refusing to launch: TELLER_ENROLLMENT_ID is not set on the backend. ' +
            'Reconnect requires update mode — set the env var and restart the backend.'
          );
          return;
        }
        setStatus(`Ready to reconnect existing enrollment ${cfg.enrollmentId} (update mode)`);
      })
      .catch((err) => {
        console.error('Failed to load Teller config:', err);
        setStatus(`Failed to load Teller config: ${err.message}`);
      });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof window.TellerConnect !== 'undefined') {
      setTellerLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.teller.io/connect/connect.js';
    script.async = true;
    script.onload = () => setTellerLoaded(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!tellerLoaded || !config || typeof window.TellerConnect === 'undefined') return;
    if (!config.enrollmentId) return;

    const setupOptions = {
      applicationId: config.applicationId,
      environment: config.environment,
      enrollmentId: config.enrollmentId,
      products: ['transactions'],
      onInit: () => {
        console.log('Teller Connect initialized in UPDATE MODE', {
          environment: config.environment,
          enrollmentId: config.enrollmentId,
        });
      },
      onSuccess: async (enrollment) => {
        setEnrollmentResult(enrollment);

        if (enrollment.enrollment?.id && enrollment.enrollment.id !== config.enrollmentId) {
          setStatus(
            `WARNING: Teller returned a DIFFERENT enrollment id (${enrollment.enrollment.id}) ` +
            `than the one we sent (${config.enrollmentId}). This means a new enrollment was created — ` +
            `not a reconnect. Do NOT save this token. Investigate before proceeding.`
          );
          return;
        }

        setStatus('Reconnected to existing enrollment. Verifying with backend...');
        try {
          const response = await fetch('/api/teller/enrollment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ accessToken: enrollment.accessToken, enrollment }),
          });
          if (!response.ok) throw new Error(`Backend rejected enrollment (${response.status})`);
          setIsConnected(true);
          setStatus(
            'Reconnected. Existing TELLER_ACCESS_TOKEN should now work — try Fetch Teller Transactions. ' +
            'No .env change needed in update mode.'
          );
          if (onSuccessProp) onSuccessProp(enrollment);
        } catch (error) {
          setStatus(`Backend ack failed: ${error.message}`);
          console.error('Error notifying backend:', error);
        }
      },
      onExit: () => setStatus('Reconnect cancelled'),
      onError: (error) => {
        console.error('Teller Connect error:', error);
        setStatus(`Error: ${error.message || 'unknown'}`);
      },
    };

    setTellerConnect(window.TellerConnect.setup(setupOptions));
  }, [tellerLoaded, config, backendUrl, onSuccessProp]);

  const canReconnect = Boolean(tellerConnect && config?.enrollmentId);

  const handleConnect = useCallback(() => {
    if (!config?.enrollmentId) {
      setStatus('Refusing to launch: no enrollmentId — would create a new connection instead of reconnecting.');
      return;
    }
    if (tellerConnect) tellerConnect.open();
    else setStatus('Teller Connect is still loading...');
  }, [tellerConnect, config]);

  const buttonLabel = isConnected
    ? 'Reconnected'
    : !config
    ? 'Loading...'
    : !config.enrollmentId
    ? 'Reconnect Unavailable (no enrollment id)'
    : 'Reconnect Bank (Update Mode)';

  return (
    <div className="my-4">
      <button
        onClick={handleConnect}
        disabled={!canReconnect || disabled}
        className={`px-4 py-3 rounded font-bold text-base transition-colors duration-200 ${
          !canReconnect || disabled
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
            : 'bg-green-500 hover:bg-green-700 text-white'
        }`}
      >
        {buttonLabel}
      </button>
      {status && <p className="mt-2 text-sm text-gray-300">{status}</p>}
      {enrollmentResult && (
        <pre className="mt-3 p-3 bg-gray-900 text-green-300 text-xs rounded overflow-auto max-w-2xl">
{JSON.stringify(enrollmentResult, null, 2)}
        </pre>
      )}
    </div>
  );
}
