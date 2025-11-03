'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listWithdrawalRequests, processWithdrawalRequest } from '@/app/actions';
import { WithdrawalRequest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export default function WithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const fetchedRequests = await listWithdrawalRequests();
    setRequests(fetchedRequests);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleProcessRequest = async (requestId: string, action: 'approve' | 'reject') => {
    const result = await processWithdrawalRequest(requestId, action);
    toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    fetchRequests();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="neon-title">Withdrawal Requests</h1>
        <Button variant="outline" size="sm" className="btn-outline" onClick={fetchRequests} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          <span className="ml-2 hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Card */}
      <Card className="neon-card">
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription className="neon-sub">Review and process user withdrawal requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="neon-sub">User</TableHead>
                <TableHead className="neon-sub">UPI ID</TableHead>
                <TableHead className="neon-sub hidden md:table-cell">Status</TableHead>
                <TableHead className="text-right neon-sub">Amount</TableHead>
                <TableHead className="text-right neon-sub">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="h-7 w-7 neon-loader mx-auto" />
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 neon-sub">No pending requests found.</TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id} className="neon-row">
                    <TableCell>
                      <div className="font-medium">{req.userName}</div>
                      <div className="text-xs neon-sub">{req.userEmail}</div>
                       <div className="text-xs neon-sub md:hidden">{new Date(req.requestedAt).toLocaleString()}</div>
                    </TableCell>

                    <TableCell className="font-mono text-[var(--neon-cyan)]">{req.userUpiId}</TableCell>

                    <TableCell className="hidden md:table-cell">
                      <Badge className="neon-badge capitalize">
                        {req.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right font-semibold">
                      <span className="inline-flex items-center gap-1 text-[var(--neon-cyan)]">
                        <IndianRupee className="h-4 w-4" />
                        {req.amount.toFixed(2)}
                      </span>
                    </TableCell>

                    <TableCell className="text-right space-x-2">
                      {req.status === 'pending' && (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="default" size="sm" className="btn-neon">Approve</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approve Withdrawal?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Approve ₹{req.amount.toFixed(2)} for {req.userName}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleProcessRequest(req.id, 'approve')}>
                                  Confirm
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" className="btn-danger">Reject</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject Withdrawal?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Amount will be refunded back to wallet.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleProcessRequest(req.id, 'reject')}>
                                  Reject
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
