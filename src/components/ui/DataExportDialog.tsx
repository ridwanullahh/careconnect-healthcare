// Data Export Dialog for PIPEDA Compliance
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { DataDeletionService, DeletionStatus } from '../../lib/data-deletion';
import { githubDB, collections } from '../../lib/database';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from './dialog';
import { Label } from './label';
import { Download, Trash2, AlertTriangle, Shield, Clock } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { logger } from '../../lib/observability';

const DataExportDialog: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletionRequested, setIsDeletionRequested] = useState(false);
  const [showDeletionForm, setShowDeletionForm] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [retentionDays, setRetentionDays] = useState(30);
  const [checkingDeletion, setCheckingDeletion] = useState(true);

  // Check whether the user already has an outstanding deletion request so the
  // UI shows the "Pending" state instead of the "Request deletion" button.
  useEffect(() => {
    let cancelled = false;
    const checkDeletion = async () => {
      if (!user?.id) {
        setCheckingDeletion(false);
        return;
      }
      try {
        const status = await DataDeletionService.getDeletionStatus(user.id);
        if (!cancelled) {
          setIsDeletionRequested(
            !!status && status.status === DeletionStatus.REQUESTED
          );
        }
      } catch (err) {
        console.warn('Failed to check deletion status', err);
      } finally {
        if (!cancelled) setCheckingDeletion(false);
      }
    };
    checkDeletion();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleExportData = async () => {
    if (!user) return;

    try {
      setIsExporting(true);
      const userData = await DataDeletionService.exportUserData(user.id);

      // Build a downloadable JSON file in the browser.
      const dataBlob = new Blob([JSON.stringify(userData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `careconnect-data-export-${user.id}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Data Export Complete',
        description:
          'Your data has been exported and downloaded successfully.',
      });

      await logger.info(
        'user_data_exported',
        'User exported their data',
        { data_types: Object.keys(userData) },
        user.id
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: 'Export Failed',
        description:
          'There was an error exporting your data. Please try again.',
        variant: 'destructive',
      });

      await logger.error(
        'user_data_export_failed',
        'User data export failed',
        { error: message },
        user.id
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!user) return;

    try {
      await DataDeletionService.requestDataDeletion(
        user.id,
        deletionReason,
        retentionDays
      );

      setIsDeletionRequested(true);
      setShowDeletionForm(false);

      // Persist the deletion request in the dedicated collection so admins can
      // review it from the Super Admin dashboard.
      try {
        await githubDB.insert(collections.data_deletion_requests, {
          user_id: user.id,
          requested_at: new Date().toISOString(),
          status: DeletionStatus.REQUESTED,
          reason: deletionReason || null,
          retention_period_days: retentionDays,
        });
      } catch (persistErr) {
        console.warn('Could not persist deletion request', persistErr);
      }

      toast({
        title: 'Data Deletion Requested',
        description: `Your data deletion request has been submitted. You have ${retentionDays} days to cancel this request.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: 'Request Failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleCancelDeletion = async () => {
    if (!user) return;

    try {
      await DataDeletionService.cancelDeletionRequest(user.id);

      setIsDeletionRequested(false);

      toast({
        title: 'Deletion Cancelled',
        description: 'Your data deletion request has been cancelled.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: 'Cancellation Failed',
        description:
          message || 'There was an error cancelling your deletion request.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export My Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Data Privacy &amp; Export
          </DialogTitle>
          <DialogDescription>
            Manage your personal data and privacy settings in compliance with
            privacy regulations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Data Export Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export Your Data
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Download a complete copy of your personal data stored on
              CareConnect. This includes your profile, health tool results,
              bookings, messages, and preferences.
            </p>
            <Button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export My Data
                </>
              )}
            </Button>
          </div>

          {/* Data Deletion Section */}
          <div className="border border-red-200 rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center text-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete My Account &amp; Data
            </h3>

            {checkingDeletion ? (
              <div className="flex items-center justify-center py-6">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500" />
                <span className="ml-2 text-sm text-gray-600">
                  Checking deletion status...
                </span>
              </div>
            ) : !isDeletionRequested ? (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Important Information</p>
                      <ul className="space-y-1 text-xs">
                        <li>This action will permanently delete your account and all associated data</li>
                        <li>Active bookings and ongoing treatments may be affected</li>
                        <li>You have a grace period to cancel the deletion request</li>
                        <li>Some data may be retained for legal compliance purposes</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {!showDeletionForm ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeletionForm(true)}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Request Account Deletion
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="deletionReason">
                        Reason for deletion (optional)
                      </Label>
                      <textarea
                        id="deletionReason"
                        value={deletionReason}
                        onChange={(e) => setDeletionReason(e.target.value)}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
                        rows={3}
                        placeholder="Help us improve by sharing why you're leaving..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="retentionDays">Grace period (days)</Label>
                      <select
                        id="retentionDays"
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(Number(e.target.value))}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
                      >
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        You can cancel the deletion within this period
                      </p>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="destructive"
                        onClick={handleDeleteRequest}
                        className="flex-1"
                      >
                        Confirm Deletion Request
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowDeletionForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="flex items-start">
                  <Clock className="w-4 h-4 text-red-600 mt-0.5 mr-2" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">Deletion Request Pending</p>
                    <p className="mb-3">
                      Your account is scheduled for deletion. You can still
                      cancel this request during the grace period.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelDeletion}
                      className="text-red-700 border-red-300 hover:bg-red-50"
                    >
                      Cancel Deletion Request
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Information */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium mb-2 text-green-900">Your Privacy Rights</h3>
            <div className="text-sm text-green-800 space-y-2">
              <p>Under privacy regulations, you have the right to:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Access your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Export your data in a machine-readable format</li>
                <li>Request deletion of your personal data</li>
                <li>Withdraw consent for data processing</li>
              </ul>
              <p className="mt-3">
                If you have questions about how we handle your data, please
                contact our privacy team at privacy@careconnect.health
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DataExportDialog;
