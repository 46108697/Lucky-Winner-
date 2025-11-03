import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RefundPage() {
    return (
        <div className="bg-[#171d22] min-h-screen text-white">
            <Header />
            <main className="pt-20 container mx-auto px-4 pb-16">
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Refund Policy</CardTitle>
                        <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <h3 className="font-bold text-lg">General Policy</h3>
                        <p>Thank you for playing at Lucky Winner. All funds added to a user's wallet are final and non-refundable.</p>

                        <h3 className="font-bold text-lg">1. No Refunds on Bets</h3>
                        <p>Once a bet is placed, the amount is deducted from your wallet and cannot be refunded. Please double-check your bets before confirming.</p>

                        <h3 className="font-bold text-lg">2. Account Deposits</h3>
                        <p>Deposits made to your wallet are non-refundable. The funds are for use on the Lucky Winner platform only. You can withdraw your winnings as per the withdrawal policy.</p>

                        <h3 className="font-bold text-lg">3. Exceptional Circumstances</h3>
                        <p>In case of a technical error from our side where your wallet was incorrectly debited, please contact our support team. We will investigate the issue and if an error is found, the amount will be credited back to your wallet.</p>

                        <h3 className="font-bold text-lg">4. Contact Us</h3>
                        <p>If you have any questions about our Refund Policy, please contact us through the support page.</p>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
