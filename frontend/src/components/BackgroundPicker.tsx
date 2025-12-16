"use client";

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Image, X, Check } from 'lucide-react';

interface BackgroundPickerProps {
    currentBackground: string;
    onSelectBackground: (bg: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

// Preset backgrounds with CSS gradients (no external images needed)
const presetBackgrounds = [
    { id: 'none', name: 'None', style: 'none' },
    { id: 'gradient-purple', name: 'Purple Haze', style: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'gradient-blue', name: 'Ocean Blue', style: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
    { id: 'gradient-warm', name: 'Warm Sunset', style: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 'gradient-green', name: 'Forest', style: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    { id: 'gradient-dark', name: 'Midnight', style: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
    { id: 'gradient-peach', name: 'Peach', style: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
    { id: 'paper-cream', name: 'Cream Paper', style: 'linear-gradient(180deg, #f5f0e8 0%, #e8e0d5 100%)' },
    { id: 'abstract-mesh', name: 'Abstract', style: 'radial-gradient(at 40% 20%, #ff6b6b 0px, transparent 50%), radial-gradient(at 80% 0%, #4ecdc4 0px, transparent 50%), radial-gradient(at 0% 50%, #ffe66d 0px, transparent 50%)' },
];

export function BackgroundPicker({ currentBackground, onSelectBackground, isOpen, onClose }: BackgroundPickerProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-popover border border-border rounded-xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold font-sans">Page Background</h3>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {presetBackgrounds.map((bg) => (
                        <button
                            key={bg.id}
                            onClick={() => {
                                onSelectBackground(bg.id === 'none' ? '' : bg.style);
                                onClose();
                            }}
                            className={cn(
                                "relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105",
                                currentBackground === bg.style || (bg.id === 'none' && !currentBackground)
                                    ? "border-primary ring-2 ring-primary/30"
                                    : "border-border hover:border-muted-foreground/50"
                            )}
                        >
                            <div
                                className="absolute inset-0"
                                style={{
                                    background: bg.style === 'none' ? 'var(--background)' : bg.style,
                                }}
                            />
                            {bg.id === 'none' && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs text-muted-foreground font-sans">None</span>
                                </div>
                            )}
                            {(currentBackground === bg.style || (bg.id === 'none' && !currentBackground)) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <Check className="w-6 h-6 text-white drop-shadow-lg" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                <p className="mt-4 text-xs text-muted-foreground text-center">
                    Background will be applied with subtle transparency
                </p>
            </div>
        </div>
    );
}

// Button to trigger the picker
export function BackgroundPickerButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            onClick={onClick}
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
            <Image className="w-4 h-4" />
            Background
        </Button>
    );
}
