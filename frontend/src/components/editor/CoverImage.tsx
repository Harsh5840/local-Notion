"use client";

import { X } from 'lucide-react';

interface CoverImageProps {
    coverImage: string;
    onRemove: () => void;
}

export function CoverImage({ coverImage, onRemove }: CoverImageProps) {
    if (!coverImage) return null;

    return (
        <div className="relative w-full h-48 mb-6 rounded-xl overflow-hidden group">
            <img
                src={coverImage}
                alt="Note cover"
                className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <button
                onClick={onRemove}
                className="absolute top-2 right-2 p-1.5 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
