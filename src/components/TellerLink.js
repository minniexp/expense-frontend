'use client';

import { useCallback, useState, useEffect } from 'react';

export default function TellerLink({ onSuccess: onSuccessProp, disabled }) {
  const [status, setStatus] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [tellerLoaded, setTellerLoaded] = useState(false);
  const [tellerConnect, setTellerConnect] = useState(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const isProduction = process.env.NEXT_PUBLIC_DEPLOYED_STAGE === 'production';

  // Load Teller Connect script
  useEffect(() => {
    if (typeof window.TellerConnect !== 'undefined') {
      setTellerLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.teller.io/connect/connect.js';
    script.async = true;
    script.onload = () => setTellerLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Initialize Teller Connect
  useEffect(() => {
    if (!tellerLoaded) return;

    const teller = window.TellerConnect.setup({
      applicationId: process.env.NEXT_PUBLIC_TELLER_APPLICATION_ID,
      environment: "development",
      products: ["transactions"],
      onInit: () => {
        console.log("Teller Connect has initialized");
        setStatus('Ready to connect');
      },
      onSuccess: async (enrollment) => {
        console.log("User enrolled successfully", JSON.stringify(enrollment));
        setStatus('Connected successfully! Processing enrollment...');
        
        try {
          const response = await fetch(`${backendUrl}/api/teller/enrollment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              accessToken: enrollment.accessToken,
              enrollment: enrollment 
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to process enrollment');
          }

          setIsConnected(true);
          setStatus('Connected successfully!');
          if (onSuccessProp) {
            onSuccessProp(enrollment);
          }
        } catch (error) {
          setStatus(`Error: ${error.message}`);
          console.error('Error processing enrollment:', error);
        }
      },
      onExit: () => {
        console.log("User closed Teller Connect");
        setStatus('Connection cancelled');
      },
      onError: (error) => {
        console.error("Error in Teller Connect:", error);
        setStatus(`Error: ${error.message}`);
      }
    });

    setTellerConnect(teller);

    return () => {
      // Cleanup if needed
    };
  }, [tellerLoaded, backendUrl, onSuccessProp]);

  const handleConnect = useCallback(() => {
    if (tellerLoaded && tellerConnect) {
      tellerConnect.open();
    } else {
      setStatus('Teller Connect is still loading...');
    }
  }, [tellerLoaded, tellerConnect]);

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={!tellerLoaded || isConnected || disabled || isProduction}
        className={`
          px-4 py-2 rounded font-bold transition-colors duration-200
          ${(!tellerLoaded || isConnected || disabled || isProduction)
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
            : 'bg-green-500 hover:bg-green-700 text-white'
          }
        `}
        title={isProduction ? 'Bank connection disabled in production' : ''}
      >
        {isProduction 
          ? 'Bank Connection Disabled in Production'
          : isConnected 
            ? 'Connected' 
            : 'Connect Bank Account'}
      </button>
      {status && <p className="mt-2 text-sm text-gray-500">{status}</p>}
    </div>
  );
}