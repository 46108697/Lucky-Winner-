import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
    return (
        <div className="bg-[#171d22] min-h-screen text-white">
            <Header />
            <main className="pt-20 container mx-auto px-4 pb-16">
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Privacy Policy</CardTitle>
                        <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>Your privacy is important to us. It is Lucky Winner's policy to respect your privacy regarding any information we may collect from you across our website.</p>

                        <h3 className="font-bold text-lg">1. Information We Collect</h3>
                        <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We collect information such as your name, email address, and mobile number upon registration.</p>

                        <h3 className="font-bold text-lg">2. How We Use Your Information</h3>
                        <p>We use the information we collect to operate and maintain our services, to provide you with customer support, and to communicate with you.</p>

                        <h3 className="font-bold text-lg">3. Security</h3>
                        <p>We are committed to protecting your data. We use a variety of security measures to maintain the safety of your personal information.</p>

                        <h3 className="font-bold text-lg">4. Cookies</h3>
                        <p>We use cookies to store information about visitors' preferences, to record user-specific information on which pages the user accesses or visits, and to personalize or customize our web page content based upon visitors' browser type or other information that the visitor sends via their browser.</p>

                        <h3 className="font-bold text-lg">5. Changes to This Privacy Policy</h3>
                        <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
