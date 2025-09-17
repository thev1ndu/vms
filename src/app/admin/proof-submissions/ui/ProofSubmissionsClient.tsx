'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Award,
  Star,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ProofSubmission {
  _id: string;
  taskId: {
    _id: string;
    title: string;
    xpReward?: number;
    badgeId?: string;
  };
  authUserId: {
    _id: string;
    displayName?: string;
    email?: string;
  };
  proof: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export default function ProofSubmissionsClient() {
  const [selectedSubmission, setSelectedSubmission] =
    useState<ProofSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(
    null
  );

  const { data, mutate } = useSWR<{ submissions: ProofSubmission[] }>(
    '/api/admin/proof-submissions',
    fetcher
  );

  const handleApprove = async (submission: ProofSubmission) => {
    setIsProcessing(true);
    try {
      const res = await fetch(
        `/api/admin/proof-submissions/${submission._id}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to approve submission');
        return;
      }

      const result = await res.json();
      alert(
        `Approved! Awarded ${result.xpAwarded} XP and ${result.badgesAwarded} badge(s). New level: ${result.newLevel}`
      );
      mutate();
      setActionDialogOpen(false);
    } catch (error) {
      alert('Failed to approve submission');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (submission: ProofSubmission) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(
        `/api/admin/proof-submissions/${submission._id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rejectionReason }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to reject submission');
        return;
      }

      alert('Submission rejected');
      mutate();
      setActionDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      alert('Failed to reject submission');
    } finally {
      setIsProcessing(false);
    }
  };

  const openActionDialog = (
    submission: ProofSubmission,
    type: 'approve' | 'reject'
  ) => {
    setSelectedSubmission(submission);
    setActionType(type);
    setActionDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!data) {
    return <div>Loading...</div>;
  }

  const pendingSubmissions = data.submissions.filter(
    (s) => s.status === 'pending'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Pending Proof Submissions ({pendingSubmissions.length})
        </h2>
      </div>

      {pendingSubmissions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No pending proof submissions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingSubmissions.map((submission) => (
            <Card key={submission._id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg">
                      {submission.taskId.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {submission.authUserId.displayName ||
                          submission.authUserId.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(submission.createdAt)}
                      </div>
                      {submission.taskId.xpReward && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          {submission.taskId.xpReward} XP
                        </div>
                      )}
                      {submission.taskId.badgeId && (
                        <div className="flex items-center gap-1">
                          <Award className="h-4 w-4" />
                          Badge
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(submission.status)}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(submission.status)}
                      {submission.status}
                    </div>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Proof of Completion:
                    </Label>
                    <p className="mt-1 p-3 bg-gray-50 rounded-md text-sm">
                      {submission.proof}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => openActionDialog(submission, 'approve')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => openActionDialog(submission, 'reject')}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve'
                ? 'Approve Proof Submission'
                : 'Reject Proof Submission'}
            </DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Task:</Label>
                <p className="text-sm">{selectedSubmission.taskId.title}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">User:</Label>
                <p className="text-sm">
                  {selectedSubmission.authUserId.displayName ||
                    selectedSubmission.authUserId.email}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Proof:</Label>
                <p className="text-sm p-2 bg-gray-50 rounded">
                  {selectedSubmission.proof}
                </p>
              </div>

              {actionType === 'reject' && (
                <div>
                  <Label
                    htmlFor="rejection-reason"
                    className="text-sm font-medium"
                  >
                    Rejection Reason (Required):
                  </Label>
                  <Textarea
                    id="rejection-reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this proof is insufficient..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActionDialogOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (actionType === 'approve') {
                      handleApprove(selectedSubmission);
                    } else {
                      handleReject(selectedSubmission);
                    }
                  }}
                  disabled={isProcessing}
                  className={
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }
                >
                  {isProcessing
                    ? 'Processing...'
                    : actionType === 'approve'
                    ? 'Approve'
                    : 'Reject'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
