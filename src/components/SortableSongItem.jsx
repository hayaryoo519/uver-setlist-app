import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';

export const SortableSongItem = ({ id, song, index, onRemove }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center gap-3 p-3 bg-slate-800/50 border ${isDragging ? 'border-blue-500 shadow-xl shadow-blue-500/20' : 'border-slate-700/50'} rounded-xl hover:bg-slate-700/50 transition-all mb-2`}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300 transition-colors"
            >
                <GripVertical size={18} />
            </div>

            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-slate-900 rounded-lg text-xs font-mono font-bold text-slate-500 group-hover:text-blue-400 border border-slate-700 group-hover:border-blue-500/30 transition-all">
                {(index + 1).toString().padStart(2, '0')}
            </div>

            <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                    {song.title}
                </div>
            </div>

            <button
                onClick={() => onRemove(id)}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                title="曲を削除"
            >
                <X size={16} />
            </button>
        </div>
    );
};
