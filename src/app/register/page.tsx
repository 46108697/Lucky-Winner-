
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Gem, Home, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GoogleAuthProvider, signInWithRedirect, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { handleSignIn } from "../actions";

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.641-3.238-11.28-7.663l-6.623,5.292C9.053,39.556,15.898,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.596,44,30.561,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (name.trim().length < 3) {
      setError("Name must be at least 3 characters long.");
      return;
    }
    if (!/^\d{10,15}$/.test(mobile.trim())) {
      setError("Please enter a valid mobile number.");
      return;
    }
    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password.trim() !== rePassword.trim()) {
      setError("Passwords do not match.");
      return;
    }
    
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Now create the profile in Firestore via server action
      if (userCredential.user) {
        const signInResult = await handleSignIn(userCredential.user.uid, userCredential.user.email, name);
        if (signInResult.success) {
            toast({
                title: "Registration Successful!",
                description: "You can now log in.",
            });
            router.push("/login");
        } else {
            setError(signInResult.message);
        }
      }
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            setError('This email is already registered. Please login.');
        } else {
            setError(error.message);
        }
    } finally {
      setLoading(false);
    }
  };

   const handleGoogleClick = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    try {
        await signInWithRedirect(auth, provider);
        // The user will be redirected to Google's sign-in page.
        // The result is handled on the login page after redirect.
    } catch(err: any) {
        setError("Failed to start Google sign-in. Please try again.");
        console.error(err);
        setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-royalBlue flex items-center justify-center p-4">
      <div className="bg-darkCard border border-gold/30 rounded-2xl shadow-lg shadow-gold/10 p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Gem className="text-gold h-12 w-12 mb-4" />
          <h2 className="text-white text-3xl font-cinzel">Create an Account</h2>
          <p className="text-lightGray text-sm text-center mt-2">
            Join Lucky Winner today! A 6-digit Customer ID will be generated for you upon creation.
          </p>
        </div>

        {error && <div className="bg-red-600/50 border border-red-500 text-white text-sm p-3 rounded-lg mb-4">{error}</div>}

        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
           <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-lg bg-royalBlue border border-gold/50 text-white placeholder-lightGray outline-none focus:ring-2 focus:ring-gold"
            required
            disabled={loading}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-royalBlue border border-gold/50 text-white placeholder-lightGray outline-none focus:ring-2 focus:ring-gold"
            required
            disabled={loading}
          />
          <input
            type="tel"
            placeholder="Mobile"
            inputMode="numeric"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
            className="w-full p-3 rounded-lg bg-royalBlue border border-gold/50 text-white placeholder-lightGray outline-none focus:ring-2 focus:ring-gold"
            required
            disabled={loading}
            maxLength={15}
          />
          <input
            type="password"
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-royalBlue border border-gold/50 text-white placeholder-lightGray outline-none focus:ring-2 focus:ring-gold"
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Re-enter Password"
            value={rePassword}
            onChange={(e) => setRePassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-royalBlue border border-gold/50 text-white placeholder-lightGray outline-none focus:ring-2 focus:ring-gold"
            required
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-royalBlue font-bold px-6 py-3 rounded-full hover:bg-transparent hover:border hover:border-gold hover:text-gold transition transform hover:scale-105 disabled:opacity-50"
          >
            {loading ? <><Loader2 className="animate-spin mr-2" /> Registering...</> : "Register"}
          </button>
        </form>

        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gold/30"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-darkCard px-2 text-lightGray">Or</span>
            </div>
        </div>

        <button
            onClick={handleGoogleClick}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-transparent border border-gold text-gold font-bold px-6 py-3 rounded-full hover:bg-gold hover:text-royalBlue transition transform hover:scale-105 disabled:opacity-50"
        >
            <GoogleIcon />
            <span>Sign up with Google</span>
        </button>

        <div className="text-center mt-6 space-y-2 text-sm">
            <p className="text-lightGray">
                Already have an account? <Link href="/login" className="text-gold hover:underline">Login</Link>
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

    