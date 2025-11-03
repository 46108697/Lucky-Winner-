
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createAgent, createUser } from '@/app/actions';
import { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

interface CreateUserFormProps {
    role: 'user' | 'agent';
    onAccountCreated: () => void;
    agents?: UserProfile[];
    title: string;
    description: string;
    onClose: () => void;
    agentCustomId?: string; // For agent creating a user
}

export function CreateUserForm({ role, onAccountCreated, agents, title, description, onClose, agentCustomId }: CreateUserFormProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mobile, setMobile] = useState('');
    const [assignedAgentId, setAssignedAgentId] = useState(agentCustomId || 'no-agent');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (password.length < 6) {
            toast({ title: 'Weak Password', description: 'Password must be at least 6 characters long.', variant: 'destructive' });
            setLoading(false);
            return;
        }

        try {
            let result;
            if (role === 'agent') {
                result = await createAgent(name, email, mobile, password);
            } else {
                result = await createUser(name, email, password, mobile, assignedAgentId);
            }
            

            if (result.success) {
                toast({ title: 'Success', description: result.message });
                setName('');
                setEmail('');
                setPassword('');
                setMobile('');
                setAssignedAgentId('no-agent');
                onAccountCreated();
                onClose();
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
        }

        setLoading(false);
    };

    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

    return (
        <>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>
                    {description}
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAccount} className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor={`name-${role}`}>{roleLabel} Full Name</Label>
                    <Input id={`name-${role}`} type="text" placeholder={`e.g. Rahul Kumar`} required value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`email-${role}`}>{roleLabel} Email</Label>
                    <Input id={`email-${role}`} type="email" placeholder={`${role}@example.com`} required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`mobile-${role}`}>Mobile</Label>
                    <Input id={`mobile-${role}`} type="tel" placeholder={`${roleLabel}'s mobile number`} required value={mobile} onChange={(e) => setMobile(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`password-${role}`}>Password</Label>
                    <Input id={`password-${role}`} type="password" placeholder="•••••••• (min. 6 characters)" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                </div>
                {role === 'user' && agents && (
                    <div className="space-y-2">
                        <Label htmlFor="agent-select">Assign to Agent (Optional)</Label>
                        <Select value={assignedAgentId} onValueChange={setAssignedAgentId} disabled={loading || !!agentCustomId}>
                            <SelectTrigger id="agent-select">
                                <SelectValue placeholder="Select an agent..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="no-agent">No Agent (Admin User)</SelectItem>
                                {agents.map(agent => (
                                    <SelectItem key={agent.uid} value={agent.customId}>{agent.name} ({agent.customId})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                 <DialogFooter>
                    <DialogClose asChild><Button variant="outline" type="button">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                        {loading ? 'Creating...' : `Create ${roleLabel}`}
                    </Button>
                </DialogFooter>
            </form>
        </>
    )
}
