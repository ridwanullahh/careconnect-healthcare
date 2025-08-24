// Admin Verification Queue Management
import React, { useState, useEffect } from 'react';
import { useToastService } from '../../lib/toast-service';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import VerificationService, { VerificationRequest, VerificationDocument } from '../../lib/verification';
import { Eye, Download, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

const VerificationQueuePage: React.FC = () => {
  const toast = useToastService();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadVerificationRequests();
  }, [filter]);

  const loadVerificationRequests = async () => {
    try {
      setLoading(true);
      const filterStatus = filter === 'all' ? undefined : filter;
      const data = await VerificationService.getVerificationQueue(filterStatus);
      setRequests(data.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
    } catch (error) {
      console.error('Failed to load verification requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSelect = async (request: VerificationRequest) => {
    setSelectedRequest(request);
    try {
      const docs = await VerificationService.getVerificationDocuments(request.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleReview = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await VerificationService.reviewVerificationRequest(
        requestId,
        status,
        'admin_user', // In real app, get from auth context
        reviewNotes
      );
      
      setSelectedRequest(null);
      setReviewNotes('');
      await loadVerificationRequests();
      
      toast.showInfo(`Verification ${status} successfully!`);
    } catch (error) {
      console.error('Failed to review verification:', error);
      toast.showSuccess('Failed to process review. Please try again.');
    }
  };

  const downloadDocument = (document: VerificationDocument) => {
    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${document.base64Content}`;
    link.download = document.fileName;
    link.click();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'under_review':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verification Queue</h1>
        <p className="text-gray-600">Review and approve entity verification requests</p>
      </div>

      {/* Filter Controls */}
      <div className="mb-6 flex gap-2">
        {['all', 'pending', 'under_review', 'approved', 'rejected'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status.replace('_', ' ')}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requests List */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Verification Requests</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedRequest?.id === request.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleRequestSelect(request)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm">Entity {request.entityId.slice(-8)}</span>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(request.status)}
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(request.status)} mb-2`}>
                    {request.status.replace('_', ' ')}
                  </Badge>
                  <p className="text-xs text-gray-500">
                    {new Date(request.submittedAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-600 capitalize">
                    {request.requestType} verification
                  </p>
                </div>
              ))}
              {requests.length === 0 && (
                <p className="text-gray-500 text-center py-4">No verification requests found</p>
              )}
            </div>
          </Card>
        </div>

        {/* Request Details */}
        <div className="lg:col-span-2">
          {selectedRequest ? (
            <Card className="p-6">
              <div className="mb-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold">Verification Request Details</h2>
                  <Badge className={getStatusColor(selectedRequest.status)}>
                    {selectedRequest.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Entity ID</label>
                    <p className="text-sm text-gray-900">{selectedRequest.entityId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Request Type</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedRequest.requestType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Submitted</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedRequest.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Submitted By</label>
                    <p className="text-sm text-gray-900">{selectedRequest.submittedBy}</p>
                  </div>
                </div>

                {selectedRequest.reviewedAt && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h3 className="font-medium mb-2">Review Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Reviewed By</label>
                        <p className="text-sm text-gray-900">{selectedRequest.reviewedBy}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Reviewed At</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedRequest.reviewedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {selectedRequest.reviewNotes && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700">Review Notes</label>
                        <p className="text-sm text-gray-900">{selectedRequest.reviewNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Verification Documents</h3>
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium text-sm">{doc.fileName}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            {doc.documentType} • {(doc.fileSize / 1024).toFixed(1)} KB
                          </p>
                          {doc.metadata.licenseNumber && (
                            <p className="text-xs text-gray-600">
                              License: {doc.metadata.licenseNumber}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Actions */}
              {selectedRequest.status === 'pending' && (
                <div className="border-t pt-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review Notes
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter review notes (optional)..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleReview(selectedRequest.id, 'approved')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReview(selectedRequest.id, 'rejected')}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-6">
              <div className="text-center py-12">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Request</h3>
                <p className="text-gray-500">Choose a verification request from the list to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationQueuePage;