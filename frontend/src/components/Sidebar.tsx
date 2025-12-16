"use client";

import { Plus, FileText, Star, Trash2, Settings, PanelLeftClose, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { ListNotes, ToggleNoteFavorite, DeleteNote } from '@/wailsjs/go/main/App';
import { Button } from '@/components/ui/button';
import { SettingsModal } from './SettingsModal';

interface NoteMeta {
    id: string;
    title: string;
    icon: string;
    is_favorite: boolean;
}

interface SidebarProps {
    currentNoteId: string | null;
    onNoteSelect: (id: string) => void;
    onNewNote: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

export function Sidebar({ currentNoteId, onNoteSelect, onNewNote, isOpen, onToggle }: SidebarProps) {
    const [notes, setNotes] = useState<NoteMeta[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    const refreshNotes = async () => {
        try {
            const list = await ListNotes();
            if (list) setNotes(list);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        refreshNotes();
        const interval = setInterval(refreshNotes, 2000);
        return () => clearInterval(interval);
    }, []);

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, noteId: string) => {
        e.preventDefault();
        setContextMenu({ id: noteId, x: e.clientX, y: e.clientY });
    };

    const handleToggleFavorite = async (noteId: string) => {
        try {
            await ToggleNoteFavorite(noteId);
            await refreshNotes();
        } catch (error) {
            console.error(error);
        }
        setContextMenu(null);
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm("Are you sure you want to delete this note?")) return;
        try {
            await DeleteNote(noteId);
            await refreshNotes();
        } catch (error) {
            console.error(error);
        }
        setContextMenu(null);
    };

    // Filter notes by search query
    const filteredNotes = notes.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Separate favorites and regular notes
    const favoriteNotes = filteredNotes.filter(n => n.is_favorite);
    const regularNotes = filteredNotes.filter(n => !n.is_favorite);

    const NoteItem = ({ note }: { note: NoteMeta }) => (
        <Button
            key={note.id}
            onClick={() => onNoteSelect(note.id)}
            onContextMenu={(e) => handleContextMenu(e, note.id)}
            variant="ghost"
            size="sm"
            className={cn(
                "w-full justify-start font-sans font-normal truncate group relative",
                note.id === currentNoteId
                    ? "bg-accent/50 text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
            )}
        >
            {note.icon ? (
                <span className="mr-2 text-base">{note.icon}</span>
            ) : (
                <FileText className="w-4 h-4 mr-2 opacity-50 shrink-0" />
            )}
            <span className="truncate flex-1 text-left">{note.title || "Untitled"}</span>
            {note.is_favorite && (
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0 ml-1" />
            )}
        </Button>
    );

    return (
        <aside
            className={cn(
                "h-screen bg-muted/20 border-r border-border flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative overflow-hidden",
                isOpen ? "w-64 opacity-100" : "w-0 opacity-0 border-none"
            )}
        >
            {/* Header */}
            <div className="p-4 flex items-center justify-between select-none h-14">
                <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-lg text-foreground tracking-tight">Apostrophe</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggle}>
                    <PanelLeftClose className="w-4 h-4" />
                </Button>
            </div>

            {/* Search */}
            <div className="px-3 mb-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-auto py-2 px-3">
                {/* New Page Button */}
                <div className="mb-4">
                    <Button
                        onClick={onNewNote}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground hover:text-foreground font-sans"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Page
                    </Button>
                </div>

                {/* Favorites Section */}
                {favoriteNotes.length > 0 && (
                    <div className="mb-4">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                            Favorites
                        </div>
                        <div className="space-y-0.5">
                            {favoriteNotes.map(note => (
                                <NoteItem key={note.id} note={note} />
                            ))}
                        </div>
                    </div>
                )}

                {/* All Pages Section */}
                <div>
                    {favoriteNotes.length > 0 && (
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                            Pages
                        </div>
                    )}
                    <div className="space-y-0.5">
                        {regularNotes.map(note => (
                            <NoteItem key={note.id} note={note} />
                        ))}
                    </div>
                </div>

                {filteredNotes.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-8">
                        {searchQuery ? "No notes found" : "No notes yet"}
                    </div>
                )}
            </div>

            {/* Footer with Settings */}
            <div className="p-3 border-t border-border">
                <Button
                    onClick={() => setShowSettings(true)}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground hover:text-foreground font-sans"
                >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                </Button>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed bg-popover border border-border rounded-lg shadow-xl py-1 z-50 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button
                        onClick={() => handleToggleFavorite(contextMenu.id)}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                    >
                        <Star className="w-4 h-4" />
                        {notes.find(n => n.id === contextMenu.id)?.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    </button>
                    <button
                        onClick={() => handleDeleteNote(contextMenu.id)}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                </div>
            )}

            {/* Settings Modal */}
            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </aside>
    );
}
