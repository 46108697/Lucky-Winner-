"use client";

import { Gem } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[200]">
      <div className="relative w-64 h-64 flex items-center justify-center">
        <Gem className="h-24 w-24 text-primary animate-pulse" />
      </div>
       <div className="mt-12 text-center z-10">
        <h1 className="text-xl font-bold text-foreground tracking-wider">
          Loading Lucky Winner...
        </h1>
      </div>
    </div>
  );
}
