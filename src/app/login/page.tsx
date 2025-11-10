"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { handleSignIn } from "../actions";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";

const LoginPage = () => {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !loading) {
      // This is for users who are already logged in and visit the login page
      // It should ideally not happen if the redirects are correct
      handleSignIn(user.uid, user.email || "", user.displayName || "").then(
        (result) => {
          if (result.success) {
            if (result.role === "admin") {
              router.push("/admin");
            } else if (result.role === "agent") {
              router.push("/agent");
            } else {
              router.push("/");
            }
          }
        }
      );
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      const result = await signInWithGoogle();
      if (result && result.user) {
        const signInResult = await handleSignIn(
          result.user.uid,
          result.user.email || "",
          result.user.displayName || ""
        );

        if (signInResult.success) {
          if (signInResult.role === "admin") {
            router.push("/admin");
          } else if (signInResult.role === "agent") {
            router.push("/agent");
          } else {
            router.push("/");
          }
        }
      } else {
        setError("Google Sign-In failed. Please try again.");
      }
    } catch (error) {
      console.error("Google Sign-In error:", error);
      setError("An error occurred during Google Sign-In.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <Button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-2"
          disabled={loading}
        >
          <FcGoogle size={24} />
          <span>Sign in with Google</span>
        </Button>
      </div>
    </div>
  );
};

export default LoginPage;
