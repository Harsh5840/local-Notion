"use client";

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AIInputCardProps {
    aiPrompt: string;
    isProcessing: boolean;
    onPromptChange: (value: string) => void;
    onGenerate: () => void;
    onClose: () => void;
}

export function AIInputCard({
    aiPrompt,
    isProcessing,
    onPromptChange,
    onGenerate,
    onClose,
}: AIInputCardProps) {
    return (
        <div className="absolute top-36 left-0 right-0 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="bg-popover/95 backdrop-blur-xl border border-border/40 shadow-xl rounded-xl p-4 flex flex-col gap-3 max-w-xl mx-auto ring-1 ring-black/5">
                <div className="flex justify-between items-center text-xs text-muted-foreground uppercase tracking-wider font-semibold px-1">
                    <span>AI Assistant</span>
                    <button onClick={onClose} className="hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <textarea
                    autoFocus
                    value={aiPrompt}
                    onChange={(e) => onPromptChange(e.target.value)}
                    placeholder="What would you like to write about?"
                    className="w-full bg-transparent border-none text-lg font-serif focus:ring-0 resize-none h-24 p-1 placeholder:text-muted-foreground/40"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            onGenerate();
                        }
                    }}
                />
                <div className="flex justify-end items-center pt-2">
                    <Button
                        onClick={onGenerate}
                        disabled={isProcessing}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans rounded-full px-6"
                    >
                        {isProcessing ? 'Thinking...' : 'Generate'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
