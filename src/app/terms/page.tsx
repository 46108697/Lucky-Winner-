import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
    return (
        <div className="bg-[#171d22] min-h-screen text-white">
            <Header />
            <main className="pt-20 container mx-auto px-4 pb-16">
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Terms & Conditions</CardTitle>
                        <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>Welcome to Lucky Winner! These terms and conditions outline the rules and regulations for the use of Lucky Winner's Website.</p>

                        <h3 className="font-bold text-lg">1. Acceptance of Terms</h3>
                        <p>By accessing this website, we assume you accept these terms and conditions. Do not continue to use Lucky Winner if you do not agree to all of the terms and conditions stated on this page.</p>

                        <h3 className="font-bold text-lg">2. Age Restriction</h3>
                        <p>You must be at least 18 years of age to use our services. By using our website, you warrant that you are at least 18 years of age.</p>

                        <h3 className="font-bold text-lg">3. Account Responsibilities</h3>
                        <p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account or password.</p>

                        <h3 className="font-bold text-lg">4. Gameplay</h3>
                        <p>All games are for entertainment purposes only. We do not guarantee any winnings. Please play responsibly.</p>

                        <h3 className="font-bold text-lg">5. Limitation of Liability</h3>
                        <p>In no event shall Lucky Winner, nor any of its officers, directors and employees, be held liable for anything arising out of or in any way connected with your use of this website.</p>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
