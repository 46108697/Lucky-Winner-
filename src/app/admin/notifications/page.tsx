
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';

type TargetAudience = 'all' | 'users' | 'agents';

export default function NotificationsPage() {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [target, setTarget] = useState<TargetAudience>('all');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSendNotification = async () => {
        if (!title || !message) {
            toast({
                title: 'Error',
                description: 'Please fill in both title and message.',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);
        // --- Placeholder for actual sending logic ---
        console.log('Sending notification:', { title, message, target });
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        toast({
            title: 'Notification Sent (Simulation)',
            description: `Your message "${title}" has been queued for delivery to ${target} users.`,
        });
        
        setTitle('');
        setMessage('');
        setLoading(false);
        // --- End of placeholder ---
    };

    return (
        <div className="space-y-6">
            <h1 className="neon-title">Send Notification</h1>
            <Card className="neon-card">
                <CardHeader>
                    <CardTitle>Compose Message</CardTitle>
                    <CardDescription className="neon-sub">
                        Send a push notification to your users' devices.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input 
                            id="title" 
                            placeholder="e.g., New Jackpot Alert!" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)} 
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea 
                            id="message" 
                            placeholder="Describe your announcement here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                        />
                    </div>
                    
                    <div className="space-y-3">
                         <Label>Target Audience</Label>
                         <RadioGroup 
                            value={target} 
                            onValueChange={(value: TargetAudience) => setTarget(value)}
                            className="flex flex-col sm:flex-row gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="all" />
                                <Label htmlFor="all">All Users & Agents</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="users" id="users" />
                                <Label htmlFor="users">Only Regular Users</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="agents" id="agents" />
                                <Label htmlFor="agents">Only Agents</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <Button onClick={handleSendNotification} disabled={loading} className="btn-neon w-full sm:w-auto">
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-2 h-4 w-4" />
                        )}
                        {loading ? 'Sending...' : 'Send Notification'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
