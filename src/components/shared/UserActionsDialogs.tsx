'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { updateWalletBalance, updateWalletLimit } from '@/app/actions';
import type { UserProfile } from '@/lib/types';

export function ManageWalletDialog({ user, onUpdate }: { user: UserProfile; onUpdate: () => void }) {
  const [amount, setAmount] = useState<number>(0);
  const [actionType, setActionType] = useState<'add' | 'remove'>('add');
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleUpdate = async () => {
    if (amount <= 0) {
      toast({ title: 'Info', description: 'Please enter a positive amount.', variant: 'default' });
      return;
    }
    setLoading(true);
    const finalAmount = actionType === 'add' ? amount : -amount;

    const result = await updateWalletBalance(user.uid, finalAmount, paymentType);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      setAmount(0);
      setOpen(false);
      onUpdate();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Manage Wallet</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Wallet for {user.email}</DialogTitle>
          <DialogDescription>
            Total Balance: {(user.walletBalance ?? 0).toFixed(2)} Coins.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Action</Label>
            <RadioGroup
              defaultValue="add"
              className="col-span-3 flex gap-4"
              value={actionType}
              onValueChange={(value: 'add' | 'remove') => setActionType(value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="add" id={`add-${user.uid}`} />
                <Label htmlFor={`add-${user.uid}`}>Add Coins</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="remove" id={`remove-${user.uid}`} />
                <Label htmlFor={`remove-${user.uid}`}>Remove Coins</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={`amount-${user.uid}`} className="text-right">Amount</Label>
            <Input
              id={`amount-${user.uid}`}
              type="number"
              value={amount === 0 ? '' : amount}
              onChange={(e) => setAmount(Math.abs(Number(e.target.value)))}
              className="col-span-3"
              placeholder="e.g., 500"
              min="0"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Type</Label>
            <RadioGroup
              defaultValue="cash"
              className="col-span-3 flex gap-4"
              value={paymentType}
              onValueChange={(value: 'cash' | 'credit') => setPaymentType(value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id={`cash-${user.uid}`} />
                <Label htmlFor={`cash-${user.uid}`}>Cash</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit" id={`credit-${user.uid}`} />
                <Label htmlFor={`credit-${user.uid}`}>Credit (Udhaar)</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpdate} disabled={loading || !paymentType || amount <= 0}>
            {loading ? 'Updating...' : 'Update Balance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SetWalletLimitDialog({ user, onUpdate }: { user: UserProfile; onUpdate: () => void }) {
  const [limit, setLimit] = useState<string>(user.walletLimit?.toString() || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);

    const numericLimit = limit === '' ? null : parseInt(limit, 10);
    if (limit !== '' && (isNaN(numericLimit!) || numericLimit! < 0)) {
      toast({ title: 'Error', description: 'Please enter a valid positive number for the limit.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const result = await updateWalletLimit(user.uid, numericLimit);
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
        <Button variant="outline" size="sm">Set Limit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Wallet Limit for {user.email}</DialogTitle>
          <DialogDescription>
            Set a maximum wallet balance for this user. Leave blank to remove the limit.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={`limit-${user.uid}`} className="text-right">Limit</Label>
            <Input
              id={`limit-${user.uid}`}
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="col-span-3"
              placeholder={user.role === 'agent' ? 'e.g., 50000' : 'e.g., 10000'}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? 'Updating...' : 'Set Limit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
