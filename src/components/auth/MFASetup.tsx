// Bismillah Ar-Rahman Ar-Raheem.
// MFA/TOTP setup + management component for user security settings.
// Uses the backend /api/mfa/* endpoints. No external QR dependency — renders
// the otpauth URI as a clickable link + manual secret entry.
import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import LoadingSpinner from '../ui/LoadingSpinner';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

function getToken(): string | null {
  try {
    return localStorage.getItem('careconnect_api_token');
  } catch {
    return null;
  }
}

async function mfaFetch(path: string, body?: any) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/mfa${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `MFA request failed: ${res.status}`);
  return data;
}

export default function MFASetup() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<{ secret: string; uri: string } | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await mfaFetch('/status');
        if (!cancelled) setEnabled(res.data.enabled);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSetup = async () => {
    setError('');
    setSuccess('');
    setToken('');
    try {
      const res = await mfaFetch('/setup', {});
      setSetupData(res.data);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleConfirm = async () => {
    setError('');
    setSuccess('');
    if (!token || token.length !== 6) {
      setError('Please enter the 6-digit code from your authenticator app.');
      return;
    }
    try {
      await mfaFetch('/confirm', { token });
      setEnabled(true);
      setSetupData(null);
      setToken('');
      setSuccess('MFA has been enabled. You will need a TOTP code on future logins.');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDisable = async () => {
    setError('');
    setSuccess('');
    if (!token || token.length !== 6) {
      setError('Enter your current 6-digit TOTP code to disable MFA.');
      return;
    }
    try {
      await mfaFetch('/disable', { token });
      setEnabled(false);
      setToken('');
      setSuccess('MFA has been disabled.');
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-dark mb-2">Multi-Factor Authentication (MFA)</h3>
      <p className="text-sm text-gray-500 mb-4">
        Add an extra layer of security to your account using a Time-based One-Time Password (TOTP) app
        like Google Authenticator, Authy, or 1Password.
      </p>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
      {success && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-sm">{success}</div>}

      <div className="flex items-center gap-2 mb-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {enabled ? 'Enabled' : 'Not Enabled'}
        </span>
      </div>

      {!enabled && !setupData && (
        <button onClick={handleSetup} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90">
          Enable MFA
        </button>
      )}

      {!enabled && setupData && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-dark mb-2">Step 1: Scan or enter this secret</p>
            <p className="text-xs text-gray-500 mb-2">Add a new entry in your authenticator app using this secret or the otpauth link:</p>
            <div className="bg-white border border-gray-200 rounded p-2 mb-2">
              <code className="text-xs text-gray-700 break-all">{setupData.secret}</code>
            </div>
            <a href={setupData.uri} className="text-xs text-primary underline break-all">{setupData.uri}</a>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-dark mb-2">Step 2: Enter the 6-digit code</p>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-32 p-2 border border-gray-300 rounded-lg text-center text-lg tracking-widest"
              maxLength={6}
            />
            <div className="flex gap-2 mt-3">
              <button onClick={handleConfirm} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">Confirm & Enable</button>
              <button onClick={() => { setSetupData(null); setToken(''); }} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {enabled && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">MFA is active on your account. Enter your current TOTP code to disable it.</p>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-32 p-2 border border-gray-300 rounded-lg text-center text-lg tracking-widest"
            maxLength={6}
          />
          <div>
            <button onClick={handleDisable} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-700">Disable MFA</button>
          </div>
        </div>
      )}
    </div>
  );
}
