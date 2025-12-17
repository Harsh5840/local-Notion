"use client";

import dynamic from 'next/dynamic';
import { Sidebar } from "@/components/Sidebar";
import { useState } from "react";
import { SaveNote, LoadNote } from "@/wailsjs/go/main/App";
import { Button } from "@/components/ui/button";
import { Plus, PanelLeftOpen } from "lucide-react";

const Editor = dynamic(() => import('@/components/Editor').then(mod => mod.Editor), { ssr: false });

import { AIChatSidebar } from "@/components/AIChatSidebar";

// ... existing imports

export default function Home() {
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [background, setBackground] = useState("");
  const [icon, setIcon] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNewNote = async () => {
    const newId = Date.now().toString();
    await SaveNote(newId, "Untitled", "");
    setCurrentNoteId(newId);
    setContent("");
    setTitle("Untitled");
    setBackground("");
    setIcon("");
    setRefreshKey(k => k + 1); // Trigger sidebar refresh
  };

  const handleSelectNote = async (id: string) => {
    setCurrentNoteId(id);
    try {
      const note = await LoadNote(id);
      setContent(note.content || "");
      setTitle(note.title || "Untitled");
      setBackground(note.background_image || "");
      setIcon(note.icon || "");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex w-full h-screen bg-background text-foreground overflow-hidden">
      <Sidebar
        key={refreshKey}
        currentNoteId={currentNoteId}
        onNoteSelect={handleSelectNote}
        onNewNote={handleNewNote}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <main className="flex-1 min-w-0 flex flex-col bg-background relative transition-all duration-300">

        {/* Floating Toggle when sidebar closed */}
        {!isSidebarOpen && (
          <div className="absolute top-4 left-4 z-50">
            <Button variant="ghost" size="icon" className="hover:bg-muted" onClick={() => setIsSidebarOpen(true)}>
              <PanelLeftOpen className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        )}

        {currentNoteId ? (
          <>
            <Editor
              key={currentNoteId}
              noteId={currentNoteId}
              initialContent={content}
              initialTitle={title}
              initialBackground={background}
              initialIcon={icon}
              onToggleChat={() => setIsChatOpen(!isChatOpen)}
            />
            <AIChatSidebar
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              context={title + "\n\n" + content}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-serif font-bold text-foreground">Apostrophe</h2>
              <p className="text-sm font-sans max-w-xs mx-auto opacity-70">Focus on your writing.</p>
            </div>
            <Button onClick={handleNewNote} variant="outline" className="font-sans">
              <Plus className="w-4 h-4 mr-2" /> Start Writing
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}


