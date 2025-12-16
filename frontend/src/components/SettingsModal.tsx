"use client";

import { useState, useEffect } from 'react';
import { X, Key, Check, AlertCircle, Cpu, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SetGeminiAPIKey, GetAIProvider } from '@/wailsjs/go/main/App';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [providerInfo, setProviderInfo] = useState<{ gemini_configured: boolean; ollama_model: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadProviderInfo();
        }
    }, [isOpen]);

    const loadProviderInfo = async () => {
        try {
            const info = await GetAIProvider();
            setProviderInfo(info as any);
        } catch (error) {
            console.error('Failed to load provider info:', error);
        }
    };

    const handleSaveApiKey = async () => {
        if (!apiKey.trim()) return;

        setIsSaving(true);
        setSaveStatus('idle');

        try {
            await SetGeminiAPIKey(apiKey.trim());
            setSaveStatus('success');
            setApiKey('');
            await loadProviderInfo();
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Failed to save API key:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-popover border border-border rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-border">
                    <h2 className="text-lg font-semibold font-sans">Settings</h2>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-6">
                    {/* AI Provider Status */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">AI Provider</h3>

                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Cloud className={cn("w-5 h-5", providerInfo?.gemini_configured ? "text-green-500" : "text-muted-foreground")} />
                            <div className="flex-1">
                                <div className="font-medium text-sm">Gemini API</div>
                                <div className="text-xs text-muted-foreground">
                                    {providerInfo?.gemini_configured ? 'Configured (Primary)' : 'Not configured'}
                                </div>
                            </div>
                            {providerInfo?.gemini_configured && (
                                <Check className="w-4 h-4 text-green-500" />
                            )}
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Cpu className="w-5 h-5 text-blue-500" />
                            <div className="flex-1">
                                <div className="font-medium text-sm">Ollama (Local)</div>
                                <div className="text-xs text-muted-foreground">
                                    {providerInfo?.ollama_model || 'llama3.1:8b'} (Fallback)
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* API Key Input */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            {providerInfo?.gemini_configured ? 'Update API Key' : 'Add Gemini API Key'}
                        </h3>

                        <div className="space-y-2">
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="password"
                                    placeholder="Enter your Gemini API key..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveApiKey();
                                    }}
                                />
                            </div>

                            <Button
                                onClick={handleSaveApiKey}
                                disabled={isSaving || !apiKey.trim()}
                                className="w-full"
                            >
                                {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save API Key'}
                            </Button>

                            {saveStatus === 'error' && (
                                <div className="flex items-center gap-2 text-destructive text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    Failed to save API key
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Get your API key from{' '}
                            <a
                                href="https://aistudio.google.com/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                Google AI Studio
                            </a>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-muted/30 rounded-b-xl">
                    <p className="text-xs text-muted-foreground text-center">
                        Gemini is used for AI features. Falls back to local Ollama if unavailable.
                    </p>
                </div>
            </div>
        </div>
    );
}
