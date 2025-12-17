"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X, User, Bot, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AskAI } from "@/wailsjs/go/main/App";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface AIChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    context: string; // The content of the current note
}

export function AIChatSidebar({ isOpen, onClose, context }: AIChatSidebarProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Hi! I can help you with your note. Ask me to summarize it, explain concepts, or brainstorm ideas." }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setIsLoading(true);

        try {
            // Use AskAI which includes the note context properly
            const response = await AskAI(userMsg, context);
            if (response) {
                setMessages(prev => [...prev, { role: "assistant", content: response }]);
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className={cn(
                "fixed inset-y-0 right-0 w-80 bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl z-40 transform transition-transform duration-300 ease-in-out flex flex-col font-sans",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}
        >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Assistant
                </div>
                <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "flex gap-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300",
                            msg.role === "user" ? "flex-row-reverse" : "flex-row"
                        )}
                    >
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                            msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                            {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={cn(
                            "rounded-2xl px-4 py-2.5 max-w-[85%] leading-relaxed shadow-sm",
                            msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-muted text-foreground rounded-tl-none border border-border/50"
                        )}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3 text-sm animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                        <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-2.5 text-muted-foreground border border-border/50">
                            Thinking...
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-background/50">
                <div className="relative flex items-end gap-2 bg-muted/50 p-2 rounded-xl border border-border focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask about this page..."
                        className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none p-2 text-sm placeholder:text-muted-foreground/50"
                        rows={1}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        size="icon"
                        className={cn(
                            "h-9 w-9 shrink-0 transition-opactiy rounded-lg mb-0.5",
                            !input.trim() ? "opacity-50" : "opacity-100"
                        )}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <div className="text-xs text-center text-muted-foreground/50 mt-2 flex items-center justify-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    Context: Current Page
                </div>
            </div>
        </div>
    );
}
