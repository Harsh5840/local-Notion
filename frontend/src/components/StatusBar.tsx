"use client";

import { cn } from "@/lib/utils";

interface StatusBarProps {
    text: string;
}

export function StatusBar({ text }: StatusBarProps) {
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const charCount = text.length;
    const readingTime = Math.ceil(wordCount / 200); // 200 wpm

    return (
        <div className="fixed bottom-0 right-0 p-4 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors select-none bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/30">
                <span>{wordCount} words</span>
                <span>{charCount} chars</span>
                <span>{readingTime} min read</span>
            </div>
        </div>
    );
}
