

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { listUsers, updateUserStatus, deleteUser, updateAgentCommission } from '@/app/actions';
import { UserProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, RefreshCw, Search, Eye, Percent, MoreVertical, Trash2, KeyRound } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils';
import { ManageWalletDialog } from '@/components/shared/UserActionsDialogs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreateUserForm } from '@/components/shared/CreateUserForm';
import Link from 'next/link';


function SetCommissionDialog({ agent, onUpdate, trigger }: { agent: UserProfile; onUpdate: () => void; trigger: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [rate, setRate] = useState<string>(agent.commissionRate !== undefined ? (agent.commissionRate * 100).toString() : '');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    
    const handleUpdate = async () => {
        setLoading(true);
        const numericRate = rate === '' ? null : parseFloat(rate) / 100;
        
        if (rate !== '' && (numericRate === null || isNaN(numericRate) || numericRate < 0 || numericRate > 1)) {
            toast({ title: 'Error', description: 'Please enter a valid percentage between 0 and 100.', variant: 'destructive' });
            setLoading(false);
            return;
        }

        const result = await updateAgentCommission(agent.uid, numericRate);
        if (result.success) {
            toast({ title: 'Success', description: result.message });
            onUpdate();
            setOpen(false);
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Commission for {agent.name}</DialogTitle>
                    <DialogDescription>
                        Set a custom commission rate for this agent. Leave blank to use the global default rate.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="commission-rate">Commission Rate (%)</Label>
                    <Input
                        id="commission-rate"
                        type="number"
                        placeholder="e.g., 5"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleUpdate} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Commission Rate'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'customId' | 'email' | 'mobile'>('customId');
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const { toast } = useToast();

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const agentList = await listUsers('agent');
    setAgents(agentList);
    setFilteredAgents(agentList);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    const results = agents.filter(agent => {
        const term = searchTerm.toLowerCase();
        if (!term) return true;

        const fieldValue = String(agent[searchField] || '').toLowerCase();
        return fieldValue.includes(term);
    });
    setFilteredAgents(results);
  }, [searchTerm, searchField, agents]);

  const handleStatusChange = async (uid: string, disabled: boolean) => {
    const result = await updateUserStatus(uid, disabled);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      fetchAgents();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (uid: string) => {
    const result = await deleteUser(uid);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      fetchAgents();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">Manage Agents</h1>
            <div className='flex items-center gap-2'>
                <Dialog open={isCreateAgentOpen} onOpenChange={setIsCreateAgentOpen}>
                    <DialogTrigger asChild>
                        <Button>Create Agent</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <CreateUserForm 
                            role="agent" 
                            onAccountCreated={fetchAgents}
                            title="Create New Agent"
                            description="Enter the details for the new agent account. A unique 6-digit Agent ID will be generated."
                            onClose={() => setIsCreateAgentOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" onClick={fetchAgents} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                </Button>
            </div>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent List</CardTitle>
          <CardDescription>A list of all registered agent accounts.</CardDescription>
           <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 pt-4">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:max-w-xs"
                    />
                    <Select value={searchField} onValueChange={(value: any) => setSearchField(value)}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="By..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="customId">ID</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="mobile">Mobile</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading agents...</p>
          ) : (
            <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="hidden lg:table-cell">Commission</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No agents found.</TableCell>
                  </TableRow>
                ) : (
                  filteredAgents.map((agent) => (
                    <TableRow key={agent.uid}>
                       <TableCell>
                            <div className="font-medium">{agent.customId}</div>
                            <div className="text-xs text-muted-foreground truncate">{agent.email}</div>
                        </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {agent.commissionRate !== undefined ? (
                            <span className="font-bold">{agent.commissionRate * 100}%</span>
                        ) : (
                            <span className="text-muted-foreground">Global</span>
                        )}
                      </TableCell>
                      <TableCell className='font-mono font-bold flex items-center'>
                         <IndianRupee className="h-4 w-4 mr-1"/> {agent.walletBalance?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={agent.disabled ? 'destructive' : 'default'}>
                          {agent.disabled ? 'Inactive' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{new Date(agent.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/admin/agents/${agent.uid}`} className="flex items-center"><Eye className="mr-2 h-4 w-4"/>View Report</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <ManageWalletDialog user={agent} onUpdate={fetchAgents} />
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <SetCommissionDialog agent={agent} onUpdate={fetchAgents} trigger={<div className="flex items-center w-full"><Percent className="mr-2 h-4 w-4"/>Set Commission</div>} />
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleStatusChange(agent.uid, !agent.disabled)}>
                                     <KeyRound className="mr-2 h-4 w-4"/>{agent.disabled ? 'Activate' : 'Deactivate'}
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4"/>Delete
                                        </div>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the agent account and unassign their users.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(agent.uid)}>Continue</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

