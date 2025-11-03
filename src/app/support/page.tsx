
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { ArrowLeft, Loader2, Bot, User, Paperclip, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAIChatResponse } from './actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';

interface Message {
    role: 'user' | 'model';
    content: string;
    image?: string; // data URI for the image
}

export default function SupportPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'model',
            content: 'Namaste! Main aapka AI support agent hoon. Lucky Winner app se related aapki kya sahayata kar sakta hoon?'
        }
    ]);
    const [input, setInput] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024) { // 1MB limit
                toast({ title: "File too large", description: "Please select a file smaller than 1MB.", variant: "destructive" });
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                setImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() && !image) return;

        const userMessage: Message = { role: 'user', content: input };
        if (image) {
            userMessage.image = image;
        }

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setImage(null);
        setLoading(true);

        try {
            const response = await getAIChatResponse(input, image || undefined);
            setMessages(prev => [...prev, { role: 'model', content: response }]);
        } catch (error) {
            toast({ title: "Error", description: "Could not get a response. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#171d22] min-h-screen text-white flex flex-col">
            <Header />
            <main className="flex-1 flex flex-col pt-16">
                <div className="container mx-auto px-4 py-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        <Button variant="outline" size="icon" onClick={() => router.back()}>
                            <ArrowLeft />
                        </Button>
                        <h1 className="text-3xl font-bold text-primary">AI Support</h1>
                    </div>

                    <Card className="bg-card/80 backdrop-blur-sm flex-1 flex flex-col">
                        <CardHeader>
                            <CardTitle>Chat with our AI Assistant</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                    {msg.role === 'model' && (
                                        <Avatar>
                                            <AvatarFallback><Bot /></AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={cn("rounded-lg p-3 max-w-lg", msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                        <p className="text-sm">{msg.content}</p>
                                        {msg.image && <Image src={msg.image} alt="user upload" width={200} height={200} className="rounded-md mt-2"/>}
                                    </div>
                                    {msg.role === 'user' && (
                                        <Avatar>
                                            <AvatarFallback><User /></AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                            {loading && (
                                <div className="flex items-start gap-3 justify-start">
                                    <Avatar>
                                        <AvatarFallback><Bot /></AvatarFallback>
                                    </Avatar>
                                    <div className="rounded-lg p-3 max-w-lg bg-muted">
                                        <Loader2 className="animate-spin" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </CardContent>
                        <CardFooter className="border-t pt-4">
                            <div className="flex w-full items-center gap-2">
                                 <Input 
                                    type="file" 
                                    accept="image/*" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    className="hidden"
                                />
                                <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                                <div className="flex-1 relative">
                                    <Input 
                                        placeholder="Type your message..." 
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                        disabled={loading}
                                    />
                                    {image && (
                                        <div className="absolute bottom-12 left-0 p-2 bg-muted rounded-lg">
                                            <Image src={image} alt="preview" width={60} height={60} className="rounded-md"/>
                                            <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => setImage(null)}>
                                                <X className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <Button onClick={handleSendMessage} disabled={loading}>
                                    Send
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        </div>
    );
}
