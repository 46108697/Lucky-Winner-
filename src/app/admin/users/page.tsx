

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { listUsers, updateUserStatus, deleteUser, createUser, updateUserAgent } from '@/app/actions';
import { UserProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, RefreshCw, UserPlus, Search, Eye, MoreVertical, Trash2, Edit, KeyRound, Users } from 'lucide-react';
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
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ManageWalletDialog, SetWalletLimitDialog } from '@/components/shared/UserActionsDialogs';
import { CreateUserForm } from '@/components/shared/CreateUserForm';
import Link from 'next/link';


function ChangeAgentDialog({ user, onAgentChanged, trigger }: { user: UserProfile, onAgentChanged: () => void, trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [newAgentId, setNewAgentId] = useState(user.agentId || 'no-agent');
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setLoadingAgents(true);
      listUsers('agent').then(agentList => {
        setAgents(agentList);
        setLoadingAgents(false);
      });
    }
  }, [open]);

  const handleUpdateAgent = async () => {
    setLoading(true);
    const result = await updateUserAgent(user.uid, newAgentId);

    if (result.success) {
      toast({ title: 'Success', description: result.message });
      onAgentChanged();
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
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Change Agent for {user.email}</DialogTitle>
                <DialogDescription>
                    Re-assign this user to a different agent or manage them directly as an admin.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="agent-select-change">Assign to Agent</Label>
                    <Select value={newAgentId} onValueChange={setNewAgentId} disabled={loadingAgents}>
                        <SelectTrigger id="agent-select-change">
                            <SelectValue placeholder="Select an agent..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="no-agent">No Agent (Admin User)</SelectItem>
                            {agents.map(agent => (
                                <SelectItem key={agent.uid} value={agent.uid}>{agent.name} ({agent.customId})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleUpdateAgent} disabled={loading}>
                    {loading ? 'Updating...' : 'Update Agent'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'customId' | 'email' | 'mobile'>('customId');
  const [agentFilter, setAgentFilter] = useState('all');
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);

  const { toast } = useToast();

  const fetchUsersAndAgents = useCallback(async () => {
    setLoading(true);
    const [userList, agentList] = await Promise.all([
        listUsers('user'),
        listUsers('agent')
    ]);
    setUsers(userList);
    setAgents(agentList);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsersAndAgents();
  }, [fetchUsersAndAgents]);


  const filteredUsers = useMemo(() => {
    return users
      .filter(user => {
        if (agentFilter === 'all') return true;
        if (agentFilter === 'no-agent') return !user.agentId;
        return user.agentId === agentFilter;
      })
      .filter(user => {
        const term = searchTerm.toLowerCase();
        if (!term) return true;
        
        const fieldValue = String(user[searchField] || '').toLowerCase();
        return fieldValue.includes(term);
    });
  }, [users, searchTerm, searchField, agentFilter]);

  const handleStatusChange = async (uid: string, disabled: boolean) => {
    const result = await updateUserStatus(uid, disabled);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      fetchUsersAndAgents();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (uid: string) => {
    const result = await deleteUser(uid);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      fetchUsersAndAgents();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">Manage Users</h1>
            <div className='flex items-center gap-2'>
                 <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Create User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                         <CreateUserForm 
                            role="user" 
                            onAccountCreated={fetchUsersAndAgents} 
                            agents={agents} 
                            title="Create New User" 
                            description="A unique 6-digit Customer ID will be generated automatically."
                            onClose={() => setIsCreateUserOpen(false)}
                         />
                    </DialogContent>
                </Dialog>
                 <Button variant="outline" size="sm" onClick={fetchUsersAndAgents} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                </Button>
            </div>
        </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>A list of all registered user accounts.</CardDescription>
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
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={agentFilter} onValueChange={setAgentFilter}>
                        <SelectTrigger className="w-full sm:w-[220px]">
                             <SelectValue placeholder="Filter by Agent" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Agents</SelectItem>
                            <SelectItem value="no-agent">Admin / No Agent</SelectItem>
                            {agents.map(agent => (
                                <SelectItem key={agent.uid} value={agent.uid}>{agent.name} ({agent.customId})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
            </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading users...</p>
          ) : (
            <div className="w-full overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Mobile</TableHead>
                    <TableHead className="hidden lg:table-cell">Assigned Agent</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead className="hidden md:table-cell">Wallet Limit</TableHead>
                    <TableHead className="hidden lg:table-cell">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredUsers.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center">No users found.</TableCell>
                    </TableRow>
                    ) : (
                    filteredUsers.map((user) => (
                        <TableRow key={user.uid}>
                        <TableCell>
                            <div className="font-medium">{user.customId}</div>
                            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{user.mobile || 'N/A'}</TableCell>
                        <TableCell className="hidden lg:table-cell">{user.agentCustomId || 'Admin'}</TableCell>
                        <TableCell className="font-mono font-bold">
                            <IndianRupee className="inline-block h-3.5 w-3.5 mr-1" />
                            {(user.walletBalance ?? 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            {user.walletLimit ? <span><IndianRupee className="inline-block h-3.5 w-3.5 mr-1" />{user.walletLimit.toFixed(2)}</span> : 'No Limit'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                            <Badge variant={user.disabled ? 'destructive' : 'default'}>
                            {user.disabled ? 'Inactive' : 'Active'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href={`/admin/users/${user.uid}`} className="flex items-center"><Eye className="mr-2 h-4 w-4"/>View Details</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <ManageWalletDialog user={user} onUpdate={fetchUsersAndAgents} />
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <SetWalletLimitDialog user={user} onUpdate={fetchUsersAndAgents} />
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                         <ChangeAgentDialog user={user} onAgentChanged={fetchUsersAndAgents} trigger={
                                            <div className="flex items-center w-full"><Users className="mr-2 h-4 w-4"/>Change Agent</div>
                                         } />
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleStatusChange(user.uid, !user.disabled)}>
                                        <KeyRound className="mr-2 h-4 w-4"/>{user.disabled ? 'Activate' : 'Deactivate'}
                                    </DropdownMenuItem>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4"/>Delete
                                            </div>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the user account.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(user.uid)}>Continue</AlertDialogAction>
                                            </AlertDialogFooter>
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

    

    