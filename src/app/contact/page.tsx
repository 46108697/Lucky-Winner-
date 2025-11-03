import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Mail } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
    return (
        <div className="bg-[#171d22] min-h-screen text-white">
            <Header />
            <main className="pt-20 container mx-auto px-4 pb-16">
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-cinzel">Contact Us</CardTitle>
                        <CardDescription>We're here to help.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 text-center max-w-2xl mx-auto">
                        <p>If you have any questions, issues, or feedback, please don't hesitate to reach out to us. Our team is available to assist you.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div className="border border-gold/30 p-4 rounded-lg">
                                <Bot className="mx-auto h-10 w-10 text-gold mb-2" />
                                <h3 className="font-bold text-lg">AI Support Chat</h3>
                                <p className="text-sm text-lightGray mb-4">For instant answers to common questions, try our AI-powered support chat.</p>
                                <Button asChild>
                                    <Link href="/support">Go to Support Chat</Link>
                                </Button>
                            </div>
                             <div className="border border-gold/30 p-4 rounded-lg">
                                <Mail className="mx-auto h-10 w-10 text-gold mb-2" />
                                <h3 className="font-bold text-lg">Email Support</h3>
                                <p className="text-sm text-lightGray mb-4">For other inquiries, you can reach us via email.</p>
                                <a href="mailto:support@luckywinner.com" className="text-gold break-all">support@luckywinner.com</a>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
