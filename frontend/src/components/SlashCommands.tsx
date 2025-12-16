"use client";

import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { forwardRef, useEffect, useImperativeHandle, useState, useCallback } from 'react';
import {
    Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
    Quote, Code, Minus, Table, AlertCircle, ChevronRight, Sparkles,
    Image, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
    title: string;
    description: string;
    icon: React.ReactNode;
    command: (props: { editor: any; range: any }) => void;
}

const commands: CommandItem[] = [
    {
        title: 'Heading 1',
        description: 'Large section heading',
        icon: <Heading1 className="w-4 h-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
        },
    },
    {
        title: 'Heading 2',
        description: 'Medium section heading',
        icon: <Heading2 className="w-4 h-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
        },
    },
    {
        title: 'Heading 3',
        description: 'Small section heading',
        icon: <Heading3 className="w-4 h-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
        },
    },
    {
        title: 'Bullet List',
        description: 'Create a simple bullet list',
        icon: <List className="w-4 h-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
    },
    {
        title: 'Numbered List',
        description: 'Create a numbered list',
        icon: <ListOrdered className="w-4 h-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
    },
    {
        title: 'Task List',
        description: 'Track tasks with checkboxes',
        icon: <CheckSquare className="w-4 h-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
    },
    {
        title: 'Quote',
        description: 'Capture a quote',
        icon: <Quote className="w-4 h-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
    },
    {
        title: 'Code Block',
        description: 'Add code with syntax highlighting',
        icon: <Code className="w-4 h-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
    },
    {
        title: 'Divider',
        description: 'Visual divider line',
        icon: <Minus className="w-4 h-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
    },
    {
        title: 'Table',
        description: 'Add a table',
        icon: <Table className="w-4 h-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        },
    },
    {
        title: 'Callout',
        description: 'Highlight important info',
        icon: <AlertCircle className="w-4 h-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'callout',
                attrs: { type: 'info' },
                content: [{ type: 'paragraph' }]
            }).run();
        },
    },
    {
        title: 'Image',
        description: 'Upload or embed an image',
        icon: <Image className="w-4 h-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).run();
            // Trigger file upload
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        editor.chain().focus().setImage({ src: reader.result as string }).run();
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        },
    },
];

interface CommandListProps {
    items: CommandItem[];
    command: (item: CommandItem) => void;
}

export const CommandList = forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, CommandListProps>(
    ({ items, command }, ref) => {
        const [selectedIndex, setSelectedIndex] = useState(0);

        const selectItem = useCallback((index: number) => {
            const item = items[index];
            if (item) {
                command(item);
            }
        }, [items, command]);

        const upHandler = useCallback(() => {
            setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        }, [items.length]);

        const downHandler = useCallback(() => {
            setSelectedIndex((prev) => (prev + 1) % items.length);
        }, [items.length]);

        const enterHandler = useCallback(() => {
            selectItem(selectedIndex);
        }, [selectItem, selectedIndex]);

        useEffect(() => setSelectedIndex(0), [items]);

        useImperativeHandle(ref, () => ({
            onKeyDown: ({ event }: { event: KeyboardEvent }) => {
                if (event.key === 'ArrowUp') {
                    upHandler();
                    return true;
                }
                if (event.key === 'ArrowDown') {
                    downHandler();
                    return true;
                }
                if (event.key === 'Enter') {
                    enterHandler();
                    return true;
                }
                return false;
            },
        }));

        if (items.length === 0) {
            return (
                <div className="bg-popover border border-border rounded-lg shadow-xl p-3 text-sm text-muted-foreground">
                    No results
                </div>
            );
        }

        return (
            <div className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden min-w-[280px] max-h-[320px] overflow-y-auto">
                <div className="p-1">
                    {items.map((item, index) => (
                        <button
                            key={item.title}
                            onClick={() => selectItem(index)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                                index === selectedIndex
                                    ? "bg-accent text-accent-foreground"
                                    : "text-foreground hover:bg-muted"
                            )}
                        >
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-muted text-muted-foreground">
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{item.title}</div>
                                <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }
);

CommandList.displayName = 'CommandList';

// Suggestion configuration for Tiptap
export const slashCommandSuggestion = {
    items: ({ query }: { query: string }) => {
        return commands.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
        );
    },

    render: () => {
        let component: ReactRenderer<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }>;
        let popup: TippyInstance[];

        return {
            onStart: (props: any) => {
                component = new ReactRenderer(CommandList, {
                    props,
                    editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                });
            },

            onUpdate: (props: any) => {
                component.updateProps(props);

                if (!props.clientRect) return;

                popup[0].setProps({
                    getReferenceClientRect: props.clientRect,
                });
            },

            onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                    popup[0].hide();
                    return true;
                }

                return component.ref?.onKeyDown(props) ?? false;
            },

            onExit: () => {
                popup[0].destroy();
                component.destroy();
            },
        };
    },
};
