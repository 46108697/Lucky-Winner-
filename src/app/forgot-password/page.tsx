
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from '@/lib/firebase/client';
import { Gem, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
      toast({
        title: "Email Sent!",
        description: "A password reset link has been sent to your email address.",
      });
    } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
            setError("No user found with this email address.");
        } else {
            setError("An unexpected error occurred. Please try again.");
            console.error(err);
        }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-royalBlue flex items-center justify-center p-4">
      <div className="bg-darkCard border border-gold/30 rounded-2xl shadow-lg shadow-gold/10 p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Gem className="text-gold h-12 w-12 mb-4" />
          <h2 className="text-white text-3xl font-cinzel">Forgot Password</h2>
          <p className="text-lightGray text-sm mt-2 text-center">Enter your email to receive a reset link.</p>
        </div>

        {error && <div className="bg-red-600/50 border border-red-500 text-white text-sm p-3 rounded-lg mb-4">{error}</div>}
        {sent && <div className="bg-green-600/50 border border-green-500 text-white text-sm p-3 rounded-lg mb-4">Reset link sent! Please check your email inbox (and spam folder).</div>}


        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Your Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-royalBlue border border-gold/50 text-white placeholder-lightGray outline-none focus:ring-2 focus:ring-gold"
            required
            disabled={loading || sent}
          />

          <Button
            type="submit"
            disabled={loading || sent}
            className="w-full bg-gold text-royalBlue font-bold px-6 py-3 rounded-full hover:bg-transparent hover:border hover:border-gold hover:text-gold transition transform hover:scale-105 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <div className="text-center mt-4 space-y-2 text-sm">
            <p>
                <Link href="/login" className="text-gold/80 hover:text-gold hover:underline flex items-center justify-center gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to Login
                </Link>
            </p>
             <p>
                <Link href="/" className="text-gold/80 hover:text-gold hover:underline flex items-center justify-center gap-2">
                    <Home className="h-4 w-4" /> Go to Homepage
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
}
