"use client";

import { Sparkles, Wand2, ImagePlus, Mic, MicOff, Palette, FileText, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BackgroundPickerButton } from '../BackgroundPicker';

interface EditorToolbarProps {
    isProcessing: boolean;
    isListening: boolean;
    isGeneratingCover: boolean;
    showAiInput: boolean;
    title: string;
    onToggleAiInput: () => void;
    onMagicFormat: () => void;
    onToggleRecording: () => void;
    onImageUpload: () => void;
    onGenerateCover: () => void;
    onQuickSummarize: () => void;
    onAnalyzeMood: () => void;
    onShowBackgroundPicker: () => void;
}

export function EditorToolbar({
    isProcessing,
    isListening,
    isGeneratingCover,
    showAiInput,
    title,
    onToggleAiInput,
    onMagicFormat,
    onToggleRecording,
    onImageUpload,
    onGenerateCover,
    onQuickSummarize,
    onAnalyzeMood,
    onShowBackgroundPicker,
}: EditorToolbarProps) {
    return (
        <div className={cn(
            "sticky top-0 z-10 flex items-center gap-2 mb-8 py-2 transition-all duration-300 flex-wrap",
            isProcessing ? "opacity-50 pointer-events-none" : "opacity-0 hover:opacity-100 focus-within:opacity-100"
        )}>
            <Button
                onClick={onToggleAiInput}
                variant="ghost"
                size="sm"
                className={cn("gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50", showAiInput && "bg-muted text-foreground")}
            >
                <Sparkles className="w-4 h-4" />
                Ask AI
            </Button>
            <Button
                onClick={onMagicFormat}
                disabled={isProcessing}
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
                <Wand2 className="w-4 h-4" />
                Format
            </Button>
            <Button
                onClick={onToggleRecording}
                variant="ghost"
                size="sm"
                className={cn("gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50", isListening && "text-red-500 bg-red-500/10 hover:bg-red-500/20 animate-pulse")}
            >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isListening ? "Stop" : "Dictate"}
            </Button>
            <Button
                onClick={onImageUpload}
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
                <ImagePlus className="w-4 h-4" />
                Image
            </Button>
            <Button
                onClick={onGenerateCover}
                disabled={isGeneratingCover || !title}
                variant="ghost"
                size="sm"
                className={cn("gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50", isGeneratingCover && "animate-pulse")}
            >
                <Palette className="w-4 h-4" />
                {isGeneratingCover ? "Generating..." : "Cover"}
            </Button>
            <Button
                onClick={onQuickSummarize}
                disabled={isProcessing}
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
                <FileText className="w-4 h-4" />
                TL;DR
            </Button>
            <Button
                onClick={onAnalyzeMood}
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
                <Brain className="w-4 h-4" />
                Mood
            </Button>
            <BackgroundPickerButton onClick={onShowBackgroundPicker} />
        </div>
    );
}
