
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { auth, db } from '@/lib/firebase/client';
import { Gem, Loader2, Home } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { handleSignIn } from "../actions";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.641-3.238-11.28-7.663l-6.623,5.292C9.053,39.556,15.898,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.596,44,30.561,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
);

export default function UnifiedLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const performRedirect = (role: UserProfile['role']) => {
    switch (role) {
      case 'admin':
        router.push('/admin');
        break;
      case 'agent':
        router.push('/agent');
        break;
      case 'user':
      default:
        router.push('/');
        break;
    }
  };

  useEffect(() => {
    // This effect only handles the redirect result from Google
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          toast({ title: "Google login successful! Finishing setup..." });
          const signInResult = await handleSignIn(result.user.uid, result.user.email, result.user.displayName);
          if (signInResult.success) {
            performRedirect(signInResult.role);
          } else {
             setError("Could not create user profile.");
             setLoading(false);
          }
        }
      } catch (err) {
        console.error("Google Redirect Error:", err);
        setError("Failed to complete Google login.");
        setLoading(false);
      }
    };
    handleRedirect();

    // This listener only handles the case where a user is already logged in
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if(user) {
           // We are not redirecting from here anymore to avoid race conditions.
           // This listener is now mainly for auto-login if a session exists.
           // To prevent a logged-in user from seeing the login page, we can perform a quick check.
           console.log("User is already logged in. Redirect logic has been moved.");
        }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!identifier || !password) {
      setError("Please enter both ID/Email and password.");
      setLoading(false);
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const isEmail = identifier.includes('@');
      const q = isEmail 
        ? query(usersRef, where("email", "==", identifier), limit(1))
        : query(usersRef, where("customId", "==", identifier.toUpperCase()), limit(1));

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("No account found.");
        setLoading(false);
        return;
      }

      const userData = querySnapshot.docs[0].data() as UserProfile;

      const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
      
      const signInResult = await handleSignIn(userCredential.user.uid, userCredential.user.email, userCredential.user.displayName);
      if (signInResult.success) {
        toast({ title: `Welcome back, ${userCredential.user.displayName || userData.name}!` });
        performRedirect(signInResult.role);
      } else {
        throw new Error("Login failed after authentication.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' ? "Incorrect password." : "Something went wrong.");
       setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      setError("Google login failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-royalBlue flex items-center justify-center p-4">
      <div className="bg-darkCard border border-gold/30 rounded-2xl shadow-lg shadow-gold/10 p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Gem className="text-gold h-12 w-12 mb-4" />
          <h2 className="text-white text-3xl font-cinzel">Welcome Back</h2>
          <p className="text-lightGray text-sm mt-2">Login to your account.</p>
        </div>

        {error && <div className="bg-red-600/50 border border-red-500 text-white text-sm p-3 rounded-lg mb-4 text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier" className="text-lightGray">ID or Email</Label>
            <Input id="identifier" type="text" placeholder="Enter your ID or Email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} disabled={loading} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />
          </div>

          <div className="text-right text-sm">
            <Link href="/forgot-password" className="text-gold/80 hover:text-gold hover:underline">Forgot Password?</Link>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin" /> : "Login"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gold/30"></span></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-darkCard px-2 text-lightGray">Or for users only</span></div>
        </div>

        <Button onClick={handleGoogleClick} disabled={loading} variant="outline" className="w-full flex items-center justify-center gap-2">
          <GoogleIcon /><span>Sign in with Google</span>
        </Button>

        <div className="text-center mt-6 space-y-2 text-sm">
          <p className="text-lightGray">Don't have an account? <Link href="/register" className="text-gold hover:underline">Register</Link></p>
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
