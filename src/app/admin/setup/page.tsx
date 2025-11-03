
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createAdmin } from '@/app/actions';
import { Gem } from 'lucide-react';
import Link from 'next/link';

export default function AdminSetupPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await createAdmin(email);

    if (result.success) {
      toast({
        title: 'Admin Created!',
        description: result.message,
        duration: 9000,
      });
      setEmail('');
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <Card className="w-full max-w-md mx-auto bg-card">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <Gem className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Account Setup</CardTitle>
          <CardDescription>
            Use this page to designate the first admin. First, <Link href="/register" className="underline text-primary">register a user</Link> with the email and password you want for the admin. Then, enter that email below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">User's Email to Promote</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email of registered user"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Promoting...' : 'Make Admin'}
            </Button>
          </form>
            <div className="mt-4 text-center text-sm">
                After creating the admin, you can <Link href="/admin/login" className="underline text-primary">login here</Link>.
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
