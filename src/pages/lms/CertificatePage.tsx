import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { githubDB as dbHelpers, collections } from '../../lib/database';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { ArrowLeft, Printer, ShieldCheck, AlertCircle, Award } from 'lucide-react';

interface CertificateRecord {
  id: string;
  course_id?: string;
  user_id?: string;
  certificate_number: string;
  issued_date?: string;
  issued_at?: string;
  expiry_date?: string;
  recipient_name?: string;
  user_name?: string;
  course_title?: string;
  instructor_name?: string;
  organization_name?: string;
  verification_code?: string;
  is_verified?: boolean;
  certificate_url?: string;
  score?: number;
}

const CertificatePage: React.FC = () => {
  const { certNumber } = useParams<{ certNumber: string }>();
  const navigate = useNavigate();

  const [certificate, setCertificate] = useState<CertificateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCertificate = async () => {
      if (!certNumber) {
        setError('Certificate number is required.');
        setLoading(false);
        return;
      }
      try {
        const records = await dbHelpers.find<CertificateRecord>(collections.certificates, {
          certificate_number: certNumber,
        });
        if (records.length === 0) {
          setError('Certificate not found. Please check the URL and try again.');
          setLoading(false);
          return;
        }
        setCertificate(records[0]);
      } catch (err) {
        console.error('Error loading certificate:', err);
        setError('Failed to load certificate. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    loadCertificate();
  }, [certNumber]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading certificate..." />
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-slate-800 mb-2">
              Certificate Unavailable
            </h1>
            <p className="text-slate-600 mb-5">{error || 'Certificate not found.'}</p>
            <Button onClick={() => navigate('/courses')} className="inline-flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Back to Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const recipientName =
    (certificate.recipient_name || certificate.user_name || 'Student').trim();
  const courseTitle = certificate.course_title || 'Course';
  const issuedDateRaw = certificate.issued_date || certificate.issued_at;
  const issuedDate = issuedDateRaw ? new Date(issuedDateRaw) : new Date();
  const expiryDate = certificate.expiry_date ? new Date(certificate.expiry_date) : null;
  const instructorName = certificate.instructor_name || 'CareConnect Healthcare Platform';
  const organizationName =
    certificate.organization_name || 'CareConnect Healthcare Platform';
  const certificateNumber = certificate.certificate_number;
  const verificationCode = certificate.verification_code || 'N/A';
  const score = typeof certificate.score === 'number' ? certificate.score : null;
  const isVerified = certificate.is_verified !== false;

  const formattedIssued = issuedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedExpiry = expiryDate
    ? expiryDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 py-8 px-4 print:bg-white print:py-0 print:px-0">
      {/* Action bar (hidden when printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 print:hidden">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="self-start text-slate-600 hover:text-slate-800 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={handlePrint} className="inline-flex items-center gap-1.5 self-start sm:self-auto">
          <Printer className="w-4 h-4" />
          Print Certificate
        </Button>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Certificate */}
        <div className="bg-white border-4 border-double border-teal-700 rounded-lg p-6 sm:p-12 shadow-2xl print:shadow-none print:border-teal-800">
          {/* Header */}
          <div className="text-center border-b-2 border-teal-200 pb-6 mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Award className="w-6 h-6 text-emerald-700" />
              <span className="text-emerald-700 text-xs sm:text-sm uppercase tracking-widest font-semibold">
                {organizationName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-800 tracking-tight">
              Certificate of Completion
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-2">
              This certifies that the holder has successfully completed the requirements of the course below.
            </p>
          </div>

          {/* Body */}
          <div className="text-center">
            <p className="text-slate-500 text-xs sm:text-sm uppercase tracking-wide mb-2">
              This is to certify that
            </p>
            <p className="text-2xl sm:text-3xl font-serif italic text-emerald-800 mb-6 inline-block border-b-2 border-emerald-300 pb-2 px-4 sm:px-8">
              {recipientName}
            </p>
            <p className="text-slate-500 text-xs sm:text-sm uppercase tracking-wide mb-2">
              has successfully completed
            </p>
            <p className="text-xl sm:text-2xl font-semibold text-slate-800 mb-8 px-2">
              {courseTitle}
            </p>

            {/* Detail grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-sm mt-10 sm:mt-12">
              <div className="border-t border-slate-200 pt-3">
                <p className="text-slate-500 uppercase tracking-wide text-xs mb-1">
                  Completion Date
                </p>
                <p className="font-semibold text-slate-700">{formattedIssued}</p>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <p className="text-slate-500 uppercase tracking-wide text-xs mb-1">
                  Instructor
                </p>
                <p className="font-semibold text-slate-700">{instructorName}</p>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <p className="text-slate-500 uppercase tracking-wide text-xs mb-1">
                  Verification Code
                </p>
                <p className="font-semibold text-slate-700 font-mono break-all">
                  {verificationCode}
                </p>
              </div>
            </div>

            {score !== null && (
              <div className="mt-8 inline-block bg-emerald-50 border border-emerald-200 rounded-full px-5 py-2">
                <p className="text-sm text-emerald-800">
                  Final Score: <span className="font-semibold">{score}%</span>
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t-2 border-teal-200 mt-10 sm:mt-12 pt-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 text-xs text-slate-500">
            <div className="space-y-1">
              <p>
                Certificate Number:{' '}
                <span className="font-mono text-slate-700 break-all">{certificateNumber}</span>
              </p>
              {formattedExpiry && (
                <p>
                  Valid until:{' '}
                  <span className="font-semibold text-slate-700">{formattedExpiry}</span>
                </p>
              )}
              <p className="text-xs text-slate-400">
                Verify online: {typeof window !== 'undefined' ? window.location.origin : ''}/certificate/{certificateNumber}
              </p>
            </div>
            <div className="text-center sm:text-right">
              <div className="w-40 border-t border-slate-400 mx-auto sm:ml-auto mb-1" />
              <p className="font-semibold text-emerald-700">{organizationName}</p>
              <p>Authorized Signature</p>
            </div>
          </div>
        </div>

        {/* Verification note (hidden when printing) */}
        <Card className="mt-6 print:hidden">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck
                className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                  isVerified ? 'text-emerald-600' : 'text-amber-500'
                }`}
              />
              <div>
                <p className="font-semibold text-slate-800">
                  {isVerified ? 'Verified Certificate' : 'Verification Pending'}
                </p>
                <p className="text-sm text-slate-600">
                  This certificate was issued electronically by {organizationName} and is valid
                  without a physical signature. To verify authenticity, share the certificate
                  number or verification code with the issuing organization.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 flex-shrink-0"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CertificatePage;
