import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { AlertCircle, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Callout types with their styling
const calloutTypes = {
    info: {
        icon: Info,
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-600 dark:text-blue-400',
    },
    warning: {
        icon: AlertTriangle,
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-600 dark:text-yellow-400',
    },
    success: {
        icon: CheckCircle,
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-600 dark:text-green-400',
    },
    error: {
        icon: XCircle,
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-600 dark:text-red-400',
    },
    note: {
        icon: AlertCircle,
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-600 dark:text-purple-400',
    },
};

type CalloutType = keyof typeof calloutTypes;

// React component for rendering the callout
function CalloutComponent({ node, updateAttributes }: { node: any; updateAttributes: (attrs: any) => void }) {
    const type = (node.attrs.type as CalloutType) || 'info';
    const config = calloutTypes[type] || calloutTypes.info;
    const IconComponent = config.icon;

    const cycleType = () => {
        const types = Object.keys(calloutTypes) as CalloutType[];
        const currentIndex = types.indexOf(type);
        const nextType = types[(currentIndex + 1) % types.length];
        updateAttributes({ type: nextType });
    };

    return (
        <NodeViewWrapper>
            <div className={cn(
                "flex gap-3 p-4 my-3 rounded-lg border",
                config.bg,
                config.border
            )}>
                <button
                    onClick={cycleType}
                    className={cn("flex-shrink-0 mt-0.5 hover:opacity-70 transition-opacity", config.text)}
                    contentEditable={false}
                    title="Click to change callout type"
                >
                    <IconComponent className="w-5 h-5" />
                </button>
                <NodeViewContent className="flex-1 prose prose-sm dark:prose-invert max-w-none [&>p]:m-0" />
            </div>
        </NodeViewWrapper>
    );
}

// Tiptap extension
export const Callout = Node.create({
    name: 'callout',

    group: 'block',

    content: 'block+',

    defining: true,

    addAttributes() {
        return {
            type: {
                default: 'info',
                parseHTML: element => element.getAttribute('data-callout-type') || 'info',
                renderHTML: attributes => ({
                    'data-callout-type': attributes.type,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-callout]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes({ 'data-callout': '' }, HTMLAttributes), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(CalloutComponent);
    },
});

export default Callout;
