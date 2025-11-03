
'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { onAuthStateChanged, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();


    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (newPassword.length < 6) {
            setError("New password must be at least 6 characters long.");
            setLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            setLoading(false);
            return;
        }

        const user = auth.currentUser;
        if (!user || !user.email) {
            setError("User not found. Please log in again.");
            setLoading(false);
            return;
        }

        const credential = EmailAuthProvider.credential(user.email, currentPassword);

        try {
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            toast({
                title: "Success!",
                description: "Your password has been changed successfully.",
            });
            router.push('/profile');
        } catch (err: any) {
            if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError("The current password you entered is incorrect.");
            } else if (err.code === 'auth/too-many-requests') {
                setError("Too many attempts. Please try again later.");
            } else {
                setError("An unexpected error occurred. Please try again.");
                console.error(err);
            }
        } finally {
            setLoading(false);
        }
    };
    
    const handleBack = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push('/');
        }
    };

    return (
         <div className="bg-[#171d22] min-h-screen text-white">
            <Header />
            <main className="pt-20 container mx-auto px-4 pb-16">
                 <div className="flex items-center gap-4 mb-6">
                    <Button variant="outline" size="icon" onClick={handleBack}>
                        <ArrowLeft />
                    </Button>
                    <h1 className="text-3xl font-bold text-primary">Change Password</h1>
                </div>

                <Card className="bg-card/80 backdrop-blur-sm max-w-lg mx-auto">
                    <CardHeader>
                        <CardTitle>Update Your Password</CardTitle>
                        <CardDescription>Enter your current and new password below.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleChangePassword} className="space-y-6">
                             {error && <div className="bg-red-600/50 border border-red-500 text-white text-sm p-3 rounded-lg">{error}</div>}
                            <div className="space-y-2">
                                <Label htmlFor="current-password">Current Password</Label>
                                <Input 
                                    id="current-password" 
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input 
                                    id="new-password" 
                                    type="password" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm New Password</Label>
                                <Input 
                                    id="confirm-password" 
                                    type="password" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                             <Button type="submit" disabled={loading} className="w-full">
                                {loading ? <Loader2 className="animate-spin" /> : "Update Password"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
