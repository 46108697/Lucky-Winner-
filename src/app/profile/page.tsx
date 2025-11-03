
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, User as UserIcon, Mail, Fingerprint, Users, ArrowLeft, KeyRound, Edit, Phone, CreditCard } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { updateUserProfile } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function EditProfileDialog({ profile, onProfileUpdate }: { profile: UserProfile, onProfileUpdate: () => void }) {
    const [name, setName] = useState(profile.name || '');
    const [mobile, setMobile] = useState(profile.mobile || '');
    const [upiId, setUpiId] = useState(profile.upiId || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { toast } = useToast();

    const handleUpdate = async () => {
        setError('');
        setLoading(true);

        const user = auth.currentUser;
        if (!user) {
            setError("User not found. Please log in again.");
            setLoading(false);
            return;
        }

        try {
            const result = await updateUserProfile(user.uid, name, mobile, upiId);

            if (result.success) {
                toast({ title: 'Success!', description: result.message });
                onProfileUpdate(); // This will close the dialog via parent state
            } else {
                setError(result.message);
            }

        } catch (err: any) {
             setError("An unexpected error occurred. Please try again.");
             console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Your Profile</DialogTitle>
                <DialogDescription>
                    Update your details below.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                 {error && <p className="text-sm font-medium text-destructive bg-destructive/20 p-3 rounded-md">{error}</p>}
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input id="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Your mobile number" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input id="upiId" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="e.g., yourname@oksbi" />
                     <p className="text-xs text-muted-foreground">Your winnings will be sent to this UPI ID.</p>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleUpdate} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}


export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const router = useRouter();

    const fetchProfile = async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            const userDocRef = doc(db, "users", currentUser.uid);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfile({
                        uid: currentUser.uid,
                        name: data.name,
                        email: data.email,
                        role: data.role,
                        customId: data.customId,
                        createdAt: data.createdAt,
                        disabled: data.disabled,
                        agentId: data.agentId,
                        agentCustomId: data.agentCustomId,
                        walletBalance: data.walletBalance,
                        cashBalance: data.cashBalance,
                        creditBalance: data.creditBalance,
                        mobile: data.mobile,
                        upiId: data.upiId
                    });
                }
                setLoading(false);
            });
        } else {
            router.push('/login');
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchProfile();
            } else {
                 router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleProfileUpdate = () => {
        setIsEditDialogOpen(false); // Close the dialog
        fetchProfile(); // Refetch profile to show updated data
    }
    
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
                    <h1 className="text-3xl font-bold text-primary">My Profile</h1>
                </div>

                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <UserIcon className="w-10 h-10 text-primary" />
                                <div>
                                    <CardTitle>{profile?.name || 'Your Account'}</CardTitle>
                                    <CardDescription>Your personal and account information.</CardDescription>
                                </div>
                            </div>
                            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <Edit className="mr-2 h-4 w-4" /> Edit Profile
                                    </Button>
                                </DialogTrigger>
                               {profile && <EditProfileDialog profile={profile} onProfileUpdate={handleProfileUpdate} />}
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center items-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : profile ? (
                            <div className="space-y-4 text-lg">
                                <div className="flex items-center gap-4">
                                    <Mail className="w-5 h-5 text-primary" />
                                    <span className="text-muted-foreground">Email:</span>
                                    <span className="font-semibold">{profile.email}</span>
                                 </div>
                                <div className="flex items-center gap-4">
                                    <Phone className="w-5 h-5 text-primary" />
                                    <span className="text-muted-foreground">Mobile:</span>
                                    <span className="font-semibold">{profile.mobile || 'Not set'}</span>
                                 </div>
                                <div className="flex items-center gap-4">
                                    <CreditCard className="w-5 h-5 text-primary" />
                                    <span className="text-muted-foreground">UPI ID:</span>
                                    <span className="font-semibold font-mono">{profile.upiId || 'Not set'}</span>
                                 </div>
                                <div className="flex items-center gap-4">
                                    <Fingerprint className="w-5 h-5 text-primary" />
                                    <span className="text-muted-foreground">Customer ID:</span>
                                    <span className="font-semibold font-mono">{profile.customId}</span>
                                </div>
                                {profile.agentCustomId && (
                                     <div className="flex items-center gap-4">
                                        <Users className="w-5 h-5 text-primary" />
                                        <span className="text-muted-foreground">Agent ID:</span>
                                        <span className="font-semibold font-mono">{profile.agentCustomId}</span>
                                    </div>
                                )}
                                <div className="border-t border-gold/20 pt-4 mt-4">
                                   <Button asChild>
                                        <Link href="/profile/change-password">
                                            <KeyRound className="mr-2 h-4 w-4" />
                                            Change Password
                                        </Link>
                                    </Button>
                                </div>

                            </div>
                        ) : (
                             <p className="text-muted-foreground text-center py-10">Could not load profile information.</p>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
