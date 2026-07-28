// Bismillah Ar-Rahman Ar-Raheem.
// ConsentAcceptanceModal — shown when an authenticated user has not yet
// accepted the current platform consent version (Terms of Service +
// Privacy Policy). Blocks the main app until the user accepts or logs out.
//
// The current consent version is sourced from auth state (which in turn
// reads it from the `current_consent_version` key in `system_settings`,
// falling back to the VITE_CURRENT_CONSENT_VERSION env var, then '1.0.0').
//
// On "I Accept": inserts a consent_records row and clears requiresConsent.
// On "Log Out": calls auth.logout().
import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, FileText, Lock, ExternalLink, AlertCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ConsentAcceptanceModalProps {
  /** Optional override for the version to display. Defaults to auth state. */
  version?: string;
}

const SUMMARY_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Healthcare Privacy',
    body: 'Your PHI is encrypted at rest and only shared with providers you explicitly authorize.',
  },
  {
    icon: FileText,
    title: 'Terms of Service',
    body: 'CareConnect is an information platform and does not replace professional medical advice.',
  },
  {
    icon: Lock,
    title: 'Data Control',
    body: 'You can export or delete your data at any time from the patient portal.',
  },
];

const ConsentAcceptanceModal: React.FC<ConsentAcceptanceModalProps> = ({ version }) => {
  const { user, requiresConsent, currentConsentVersion, acceptConsent, logout, fetchCurrentConsentVersion } =
    useAuth();
  const [accepting, setAccepting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(false);

  const effectiveVersion = useMemo(() => {
    return (version || currentConsentVersion || '1.0.0').trim();
  }, [version, currentConsentVersion]);

  // Ensure the current consent version is loaded. This is also done on app
  // init, but we re-fetch here in case the modal mounts before init finishes.
  useEffect(() => {
    if (!currentConsentVersion) {
      setLoadingVersion(true);
      fetchCurrentConsentVersion()
        .catch((e) => console.warn('ConsentAcceptanceModal: fetch version failed:', e))
        .finally(() => setLoadingVersion(false));
    }
  }, [currentConsentVersion, fetchCurrentConsentVersion]);

  const handleAccept = async () => {
    if (accepting) return;
    setError(null);
    setAccepting(true);
    try {
      const ok = await acceptConsent(effectiveVersion);
      if (!ok) {
        setError('Failed to record your acceptance. Please try again.');
      }
      // On success, requiresConsent becomes false and this modal unmounts.
    } catch (err: any) {
      setError(err?.message || 'Failed to record your acceptance. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleLogout = () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      logout();
    } finally {
      setLoggingOut(false);
    }
  };

  // The Dialog's open state mirrors `requiresConsent`. When auth clears the
  // flag (on accept) the modal closes automatically.
  const open = !!user && requiresConsent;

  return (
    <Dialog open={open} onOpenChange={() => { /* prevent dismiss by overlay click */ }}>
      <DialogContent showCloseButton={false} className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-green-600" aria-hidden="true" />
            <DialogTitle className="text-xl">
              Updated Consent — Version {loadingVersion ? '…' : effectiveVersion}
            </DialogTitle>
          </div>
          <DialogDescription>
            Welcome{user?.email ? `, ${user.email}` : ''}. Before you continue, please review
            and accept the updated platform terms.
          </DialogDescription>
        </DialogHeader>

        {/* Summary cards */}
        <div className="space-y-3 my-2">
          {SUMMARY_POINTS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex items-start gap-3 p-3 rounded-md border border-gray-200 bg-gray-50"
            >
              <Icon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{title}</p>
                <p className="text-sm text-gray-600">{body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-4 text-sm">
          <a
            href="/terms"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-green-700 hover:text-green-800 hover:underline"
          >
            Read full Terms of Service <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
          <a
            href="/privacy"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-green-700 hover:text-green-800 hover:underline"
          >
            Read full Privacy Policy <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            disabled={loggingOut || accepting}
            className="w-full sm:w-auto"
          >
            {loggingOut ? <LoadingSpinner size="sm" /> : 'Log Out'}
          </Button>
          <Button
            type="button"
            onClick={handleAccept}
            disabled={accepting || loggingOut || loadingVersion}
            className="w-full sm:w-auto"
          >
            {accepting ? <LoadingSpinner size="sm" /> : `I Accept (v${effectiveVersion})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConsentAcceptanceModal;
