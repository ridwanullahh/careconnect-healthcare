import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PasswordResetService } from '../../lib/password-reset';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [step, setStep] = useState<'request' | 'verify' | 'reset' | 'success'>(token ? 'reset' : 'request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    if (token) {
      PasswordResetService.verifyResetToken(token).then(result => {
        setTokenValid(result.valid);
        if (!result.valid) setError('This reset link is invalid or has expired.');
      });
    }
  }, [token]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { token: resetToken } = await PasswordResetService.createResetToken(email);
      const url = PasswordResetService.generateResetURL(resetToken);
      // Send the reset link via the backend email service (SMTP creds stay server-side).
      // Never display the reset URL in the UI — that is a security hole.
      try {
        const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
        await fetch(`${apiBase}/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: 'Reset Your CareConnect Password',
            html: `<p>We received a request to reset your CareConnect account password.</p><p>Click the link below to reset it (valid for 1 hour):</p><p><a href="${url}">${url}</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
          }),
        });
      } catch (emailErr) {
        console.warn('Failed to send reset email:', emailErr);
      }
      // Generic message — does not reveal whether the email exists.
      setMessage('If an account exists for that email address, a password reset link has been sent. Please check your inbox and spam folder.');
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to create reset token');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      await PasswordResetService.resetPassword(token!, password);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {step === 'request' && 'Reset Password'}
            {step === 'verify' && 'Check Your Email'}
            {step === 'reset' && 'Set New Password'}
            {step === 'success' && 'Password Reset!'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {step === 'request' && 'Enter your email to receive a reset link'}
            {step === 'verify' && 'Follow the link to reset your password'}
            {step === 'reset' && 'Enter your new password below'}
            {step === 'success' && 'Your password has been reset successfully'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm break-all">
            {message}
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {!tokenValid && <p className="text-red-500 text-sm">This link is invalid or expired. Please request a new one.</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Confirm your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !tokenValid}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="text-4xl">&#10003;</div>
            <p className="text-gray-600 dark:text-gray-400">You can now log in with your new password.</p>
            <Link to="/login" className="inline-block py-3 px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition">
              Go to Login
            </Link>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
