"use server";
import { adminDb } from "@/lib/firebase/admin";
import { UserProfile } from "@/lib/types";

export const handleSignIn = async (
  uid: string,
  email: string,
  displayName: string
) => {
  try {
    const userRef = adminDb.collection("users").doc(uid);
    const doc = await userRef.get();

    if (doc.exists) {
      // User already exists, just return their role
      const userData = doc.data() as UserProfile;
      return {
        success: true,
        isNewUser: false,
        role: userData.role,
        message: "Logged in successfully!",
      };
    } else {
      // New user, create a profile
      const newUser: UserProfile = {
        uid,
        email,
        displayName,
        role: "user",
        createdAt: new Date().toISOString(),
      };
      await userRef.set(newUser);
      return {
        success: true,
        isNewUser: true,
        role: "user",
        message: "Profile created successfully!",
      };
    }
  } catch (error) {
    console.error("Error in handleSignIn:", error);
    return {
      success: false,
      message: "An error occurred during sign-in.",
    };
  }
};