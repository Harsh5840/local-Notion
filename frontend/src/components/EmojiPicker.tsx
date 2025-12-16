"use client";

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Smile } from 'lucide-react';

interface EmojiPickerProps {
    currentEmoji: string;
    onSelectEmoji: (emoji: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

// Common emojis organized by category
const emojiGroups = {
    'Recent': ['📝', '📄', '📋', '✨', '🎯', '💡', '🔥', '⭐'],
    'Objects': ['📝', '📄', '📋', '📁', '📂', '📌', '📎', '🔖', '📚', '📖', '📓', '📒', '📕', '📗', '📘', '📙'],
    'Symbols': ['✨', '⭐', '🌟', '💫', '✅', '❌', '❓', '❗', '💯', '🔴', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪'],
    'Nature': ['🌱', '🌿', '🍀', '🌸', '🌺', '🌻', '🌴', '🌲', '🍁', '🍂', '🌊', '⛰️', '🏔️', '🌅', '🌙', '⭐'],
    'Activities': ['🎯', '🎨', '🎬', '🎮', '🎲', '🎸', '🎹', '🎭', '🏆', '🥇', '🎖️', '🏅', '⚽', '🏀', '🎾', '🏈'],
    'Tech': ['💻', '🖥️', '📱', '⌨️', '🖱️', '💾', '💿', '📀', '🔌', '🔋', '📡', '🛰️', '🚀', '🤖', '🔧', '⚙️'],
    'Food': ['☕', '🍵', '🧃', '🍕', '🍔', '🍟', '🌭', '🥗', '🍜', '🍣', '🍰', '🧁', '🍪', '🍩', '🍫', '🍬'],
    'Faces': ['😀', '😃', '😄', '😁', '😊', '🥰', '😎', '🤓', '🧐', '🤔', '😴', '🤯', '🥳', '😇', '🤩', '😤'],
};

export function EmojiPicker({ currentEmoji, onSelectEmoji, isOpen, onClose }: EmojiPickerProps) {
    const [activeGroup, setActiveGroup] = useState('Recent');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-popover border border-border rounded-xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-3 border-b border-border">
                    <h3 className="text-sm font-semibold font-sans">Choose an icon</h3>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
                    {Object.keys(emojiGroups).map((group) => (
                        <button
                            key={group}
                            onClick={() => setActiveGroup(group)}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                                activeGroup === group
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            {group}
                        </button>
                    ))}
                </div>

                {/* Emoji Grid */}
                <div className="p-3 max-h-[300px] overflow-y-auto">
                    <div className="grid grid-cols-8 gap-1">
                        {/* Remove icon option */}
                        <button
                            onClick={() => {
                                onSelectEmoji('');
                                onClose();
                            }}
                            className={cn(
                                "w-9 h-9 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground",
                                !currentEmoji && "ring-2 ring-primary"
                            )}
                            title="Remove icon"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {emojiGroups[activeGroup as keyof typeof emojiGroups].map((emoji, index) => (
                            <button
                                key={`${emoji}-${index}`}
                                onClick={() => {
                                    onSelectEmoji(emoji);
                                    onClose();
                                }}
                                className={cn(
                                    "w-9 h-9 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-xl",
                                    currentEmoji === emoji && "ring-2 ring-primary bg-muted"
                                )}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Button to trigger the picker (used in editor title area)
export function EmojiPickerTrigger({
    emoji,
    onClick,
    size = 'default'
}: {
    emoji: string;
    onClick: () => void;
    size?: 'default' | 'small';
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors",
                size === 'default' ? "w-16 h-16 text-4xl" : "w-8 h-8 text-xl"
            )}
            title="Add icon"
        >
            {emoji || <Smile className={cn("text-muted-foreground/50", size === 'default' ? "w-10 h-10" : "w-5 h-5")} />}
        </button>
    );
}
