export const dynamic = 'force-dynamic';
import admin from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = admin.firestore();
    await db.doc("test/connection").set({ ok: true, time: new Date().toISOString() });
    return NextResponse.json({ success: true, message: "Firebase Admin connected successfully!" });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
