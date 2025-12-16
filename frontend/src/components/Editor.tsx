"use client";

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

import { Sparkles, Wand2, X, Languages, ImagePlus, MessageSquare, FileText, Lightbulb, ListChecks, Repeat, Brain, Star } from 'lucide-react';
import { ProcessContent, GenerateContent, SaveNote, SaveImage, SetNoteBackground, SetNoteIcon } from '@/wailsjs/go/main/App';
import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { marked } from 'marked';
import { BackgroundPicker, BackgroundPickerButton } from './BackgroundPicker';
import { EmojiPicker, EmojiPickerTrigger } from './EmojiPicker';
import { slashCommandSuggestion } from './SlashCommands';
import { Callout } from './extensions/Callout';

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

// Slash command extension
const SlashCommands = Extension.create({
    name: 'slashCommands',
    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: any) => {
                    props.command({ editor, range });
                },
            },
        };
    },
    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});

// Simple debounce inline for speed
function useDebouncedCallback(callback: (...args: any[]) => void, delay: number) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return useCallback((...args: any[]) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);
}

interface EditorProps {
    noteId: string;
    initialContent: string;
    initialTitle: string;
    initialBackground?: string;
    initialIcon?: string;
}

function EditorComponent({ noteId, initialContent, initialTitle, initialBackground = '', initialIcon = '' }: EditorProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [showAiInput, setShowAiInput] = useState(false);
    const [title, setTitle] = useState(initialTitle);
    const [mounted, setMounted] = useState(false);
    const [background, setBackground] = useState(initialBackground);
    const [icon, setIcon] = useState(initialIcon);
    const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // For Bubble Menu state
    const [activeMenu, setActiveMenu] = useState<'main' | 'tone' | 'translate' | 'ai'>('main');

    // Refs for accessing latest state in callbacks without re-creating editor
    const titleRef = useRef(title);
    const noteIdRef = useRef(noteId);

    useEffect(() => {
        titleRef.current = title;
    }, [title]);

    useEffect(() => {
        noteIdRef.current = noteId;
    }, [noteId]);

    // Sync when note changes
    useEffect(() => {
        setBackground(initialBackground);
        setIcon(initialIcon);
    }, [initialBackground, initialIcon]);

    // Track mount state for hydration safety
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const extensions = useMemo(() => [
        StarterKit.configure({
            codeBlock: false, // Use CodeBlockLowlight instead
        }),
        Typography,
        Placeholder.configure({
            placeholder: "Type '/' for commands...",
        }),
        Image.configure({
            inline: false,
            allowBase64: true,
            HTMLAttributes: {
                class: 'editor-image',
            },
        }),
        TaskList,
        TaskItem.configure({
            nested: true,
        }),
        Table.configure({
            resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        CodeBlockLowlight.configure({
            lowlight,
        }),
        Callout,
        SlashCommands.configure({
            suggestion: slashCommandSuggestion,
        }),
    ], []);

    const saveCallback = useCallback((id: string, t: string, c: string) => {
        if (id) SaveNote(id, t, c);
    }, []);

    const debouncedSave = useDebouncedCallback(saveCallback, 1000);

    const editor = useEditor({
        extensions,
        content: initialContent || '',
        editorProps: {
            attributes: {
                class: 'prose prose-lg md:prose-xl font-serif text-foreground dark:prose-invert max-w-none focus:outline-none min-h-[60vh] pb-32 leading-relaxed',
            },
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (!items) return false;

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.type.startsWith('image/')) {
                        event.preventDefault();
                        const file = item.getAsFile();
                        if (file) {
                            handleImageUpload(file);
                        }
                        return true;
                    }
                }
                return false;
            },
            handleDrop: (view, event) => {
                const files = event.dataTransfer?.files;
                if (!files || files.length === 0) return false;

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file.type.startsWith('image/')) {
                        event.preventDefault();
                        handleImageUpload(file);
                        return true;
                    }
                }
                return false;
            },
        },
        onUpdate: ({ editor }) => {
            debouncedSave(noteIdRef.current, titleRef.current, editor.getHTML());
        },
        immediatelyRender: false,
    });

    // Handle image upload
    const handleImageUpload = async (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target?.result as string;
            try {
                const imagePath = await SaveImage(noteId, base64, `${Date.now()}-${file.name}`);
                if (editor && imagePath) {
                    editor.chain().focus().setImage({ src: imagePath }).run();
                }
            } catch (error) {
                console.error('Failed to save image:', error);
                if (editor) {
                    editor.chain().focus().setImage({ src: base64 }).run();
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const triggerImageUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) handleImageUpload(file);
        };
        input.click();
    };

    // Initial load sync
    useEffect(() => {
        if (editor && initialContent !== editor.getHTML()) {
            editor.commands.setContent(initialContent || '');
        }
        setTitle(initialTitle);
    }, [noteId, initialContent, editor, initialTitle]);

    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle);
        if (editor) debouncedSave(noteId, newTitle, editor.getHTML());
    };

    const handleBackgroundChange = async (newBackground: string) => {
        setBackground(newBackground);
        try {
            await SetNoteBackground(noteId, newBackground);
        } catch (error) {
            console.error('Failed to save background:', error);
        }
    };

    const handleIconChange = async (newIcon: string) => {
        setIcon(newIcon);
        try {
            await SetNoteIcon(noteId, newIcon);
        } catch (error) {
            console.error('Failed to save icon:', error);
        }
    };

    // --- AI Logic ---
    const insertMarkdownAsHtml = async (markdownText: string) => {
        if (!editor) return;
        const html = await marked.parse(markdownText);
        editor.commands.insertContent(html);
    };

    const processSelection = async (instruction: string) => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to);
        if (!text) return;

        setIsProcessing(true);
        try {
            const result = await ProcessContent(text, instruction);
            if (result && !result.startsWith("Error")) {
                editor.commands.deleteSelection();
                await insertMarkdownAsHtml(result);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsProcessing(false);
            setActiveMenu('main');
        }
    };

    const generateContent = async () => {
        if (!aiPrompt || !editor) return;
        setIsProcessing(true);
        try {
            const result = await GenerateContent(aiPrompt);
            if (result && !result.startsWith("Error")) {
                await insertMarkdownAsHtml(result);
            }
            setAiPrompt("");
            setShowAiInput(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const magicFormat = async () => {
        if (!editor) return;
        const fullText = editor.getText();
        setIsProcessing(true);
        try {
            const result = await ProcessContent(fullText, "Format this text into a clean, structured document using Markdown. Use Headers, Bullet points, and Bold text where appropriate.");
            if (result && !result.startsWith("Error")) {
                editor.commands.setContent("");
                await insertMarkdownAsHtml(result);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Loading state
    if (!editor) {
        return <div className="flex-1 h-screen bg-background" />;
    }

    return (
        <div className="editor-background-wrapper flex-1 h-screen overflow-auto bg-background cursor-text relative scroll-smooth">
            {/* Translucent Background */}
            {background && (
                <div
                    className="editor-background"
                    style={{ background }}
                />
            )}

            <div className="editor-content-wrapper max-w-3xl mx-auto px-8 py-12 relative min-h-screen animate-in fade-in duration-700">
                {/* Icon & Title */}
                <div className="flex items-start gap-4 mb-8">
                    <EmojiPickerTrigger
                        emoji={icon}
                        onClick={() => setShowEmojiPicker(true)}
                    />
                    <input
                        className="flex-1 text-4xl md:text-5xl font-sans font-bold border-none outline-none bg-transparent text-foreground/90 placeholder:text-muted-foreground/30 tracking-tight pt-2"
                        placeholder="Untitled"
                        title="Page Title"
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                    />
                </div>

                {/* Toolbar */}
                <div className={cn("sticky top-0 z-10 flex items-center gap-2 mb-8 py-2 transition-all duration-300", isProcessing ? "opacity-50 pointer-events-none" : "opacity-0 hover:opacity-100 focus-within:opacity-100")}>
                    <Button
                        onClick={() => setShowAiInput(!showAiInput)}
                        variant="ghost"
                        size="sm"
                        className={cn("gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50", showAiInput && "bg-muted text-foreground")}
                    >
                        <Sparkles className="w-4 h-4" />
                        Ask AI
                    </Button>
                    <Button
                        onClick={magicFormat}
                        disabled={isProcessing}
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                        <Wand2 className="w-4 h-4" />
                        Format
                    </Button>
                    <Button
                        onClick={triggerImageUpload}
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                        <ImagePlus className="w-4 h-4" />
                        Image
                    </Button>
                    <BackgroundPickerButton onClick={() => setShowBackgroundPicker(true)} />
                </div>

                {/* AI Input Card */}
                {showAiInput && (
                    <div className="absolute top-36 left-0 right-0 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="bg-popover/95 backdrop-blur-xl border border-border/40 shadow-xl rounded-xl p-4 flex flex-col gap-3 max-w-xl mx-auto ring-1 ring-black/5">
                            <div className="flex justify-between items-center text-xs text-muted-foreground uppercase tracking-wider font-semibold px-1">
                                <span>AI Assistant</span>
                                <button onClick={() => setShowAiInput(false)} className="hover:text-foreground"><X className="w-4 h-4" /></button>
                            </div>
                            <textarea
                                autoFocus
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="What would you like to write about?"
                                className="w-full bg-transparent border-none text-lg font-serif focus:ring-0 resize-none h-24 p-1 placeholder:text-muted-foreground/40"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        generateContent();
                                    }
                                }}
                            />
                            <div className="flex justify-end items-center pt-2">
                                <Button
                                    onClick={generateContent}
                                    disabled={isProcessing}
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans rounded-full px-6"
                                >
                                    {isProcessing ? 'Thinking...' : 'Generate'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Editor Content */}
                <EditorContent editor={editor} />

                {/* Bubble Menu - Enhanced with AI actions */}
                {mounted && editor && (
                    <BubbleMenu
                        editor={editor}
                        tippyOptions={{ duration: 100, placement: 'top', appendTo: 'parent' }}
                        className="bg-popover border border-border/50 bg-background/95 backdrop-blur-md shadow-lg rounded-xl px-2 py-1.5 flex items-center gap-1 overflow-hidden"
                    >
                        {activeMenu === 'main' && (
                            <>
                                <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors", editor.isActive('bold') && 'bg-muted text-foreground')}><span className="font-bold text-sm">B</span></button>
                                <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors", editor.isActive('italic') && 'bg-muted text-foreground')}><span className="italic font-serif text-sm">i</span></button>
                                <button onClick={() => editor.chain().focus().toggleCode().run()} className={cn("p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-mono text-xs", editor.isActive('code') && 'bg-muted text-foreground')}>&lt;/&gt;</button>
                                <div className="w-px h-5 bg-border/50 mx-1" />

                                <button onClick={() => setActiveMenu('ai')} className="px-3 py-1.5 rounded-lg hover:bg-muted text-xs font-sans font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3" /> AI
                                </button>
                                <button onClick={() => setActiveMenu('tone')} className="px-3 py-1.5 rounded-lg hover:bg-muted text-xs font-sans font-medium text-muted-foreground hover:text-foreground transition-colors">
                                    Tone
                                </button>
                                <button onClick={() => setActiveMenu('translate')} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    <Languages className="w-4 h-4" />
                                </button>
                            </>
                        )}

                        {activeMenu === 'ai' && (
                            <>
                                <button onClick={() => setActiveMenu('main')} className="p-2 rounded-lg hover:bg-muted"><X className="w-3 h-3" /></button>
                                <div className="w-px h-5 bg-border/50 mx-1" />
                                <button onClick={() => processSelection("Improve this text: make it clearer, fix grammar, and polish the writing")} className="px-3 py-1.5 rounded-lg hover:bg-muted text-xs font-sans flex items-center gap-1.5"><Wand2 className="w-3 h-3" />Improve</button>
                                <button onClick={() => processSelection("Summarize this text in 1-2 sentences")} className="px-3 py-1.5 rounded-lg hover:bg-muted text-xs font-sans flex items-center gap-1.5"><FileText className="w-3 h-3" />Summarize</button>
                                <button onClick={() => processSelection("Explain this concept in simple terms")} className="px-3 py-1.5 rounded-lg hover:bg-muted text-xs font-sans flex items-center gap-1.5"><Lightbulb className="w-3 h-3" />Explain</button>
                                <button onClick={() => processSelection("Extract action items from this text as a bullet list")} className="px-3 py-1.5 rounded-lg hover:bg-muted text-xs font-sans flex items-center gap-1.5"><ListChecks className="w-3 h-3" />Actions</button>
                            </>
                        )}

                        {activeMenu === 'tone' && (
                            <>
                                <button onClick={() => setActiveMenu('main')} className="p-2 rounded-lg hover:bg-muted"><X className="w-3 h-3" /></button>
                                <div className="w-px h-5 bg-border/50 mx-1" />
                                <button onClick={() => processSelection("Make this text more professional and formal")} className="px-3 py-1.5 rounded-lg hover:bg-muted text-xs font-sans">Formal</button>
                                <button onClick={() => processSelection("Make this text friendlier and more casual")} className="px-3 py-1.5 rounded-lg hover:bg-muted text-xs font-sans">Casual</button>
                                <button onClick={() => processSelection("Make this text more concise")} className="px-3 py-1.5 rounded-lg hover:bg-muted text-xs font-sans">Shorter</button>
                                <button onClick={() => processSelection("Expand this text with more detail")} className="px-3 py-1.5 rounded-lg hover:bg-muted text-xs font-sans">Longer</button>
                            </>
                        )}

                        {activeMenu === 'translate' && (
                            <>
                                <button onClick={() => setActiveMenu('main')} className="p-2 rounded-lg hover:bg-muted"><X className="w-3 h-3" /></button>
                                <div className="w-px h-5 bg-border/50 mx-1" />
                                <button onClick={() => processSelection("Translate to Spanish")} className="px-3 py-1.5 rounded-lg hover:bg-muted text-xs font-sans">Spanish</button>
                                <button onClick={() => processSelection("Translate to French")} className="px-3 py-1.5 rounded-lg hover:bg-muted text-xs font-sans">French</button>
                                <button onClick={() => processSelection("Translate to German")} className="px-3 py-1.5 rounded-lg hover:bg-muted text-xs font-sans">German</button>
                                <button onClick={() => processSelection("Translate to Hindi")} className="px-3 py-1.5 rounded-lg hover:bg-muted text-xs font-sans">Hindi</button>
                            </>
                        )}
                    </BubbleMenu>
                )}
            </div>

            {/* Modals */}
            <BackgroundPicker
                currentBackground={background}
                onSelectBackground={handleBackgroundChange}
                isOpen={showBackgroundPicker}
                onClose={() => setShowBackgroundPicker(false)}
            />
            <EmojiPicker
                currentEmoji={icon}
                onSelectEmoji={handleIconChange}
                isOpen={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
            />
        </div>
    );
}

export const Editor = memo(EditorComponent);
