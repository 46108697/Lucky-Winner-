import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gem } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="bg-[#171d22] min-h-screen text-white">
            <Header />
            <main className="pt-20 container mx-auto px-4 pb-16">
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader className="text-center">
                        <Gem className="mx-auto h-12 w-12 text-gold mb-4" />
                        <CardTitle className="text-3xl font-cinzel">About Lucky Winner</CardTitle>
                        <CardDescription>Your trusted gaming partner.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-center max-w-2xl mx-auto">
                        <p>Welcome to Lucky Winner, the premier destination for online gaming entertainment. Our platform is dedicated to providing a fair, secure, and exciting experience for all our players.</p>
                        
                        <h3 className="font-bold text-lg pt-4">Our Mission</h3>
                        <p>Our mission is to offer a reliable and user-friendly platform where players can enjoy their favorite games with confidence. We are committed to timely results, transparent policies, and excellent customer support.</p>

                        <h3 className="font-bold text-lg pt-4">Why Choose Us?</h3>
                        <ul className="list-disc list-inside text-left space-y-2">
                            <li><strong>Instant Results:</strong> We provide fast and accurate game results.</li>
                            <li><strong>Secure Platform:</strong> Your data and funds are protected with top-tier security.</li>
                            <li><strong>24/7 Support:</strong> Our support team is always ready to assist you.</li>
                            <li><strong>User-Friendly Interface:</strong> Enjoy a seamless gaming experience on any device.</li>
                        </ul>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
