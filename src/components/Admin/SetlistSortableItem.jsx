import React from 'react';
import { GripVertical, Replace, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * セットリストの1行を表示するコンポーネント。
 * SetlistEditor と BulkImportModal の両方で使用されます。
 */
const SetlistSortableItem = ({ 
    id, 
    song, 
    index, 
    isActive, 
    styles = {}, 
    onRemove, 
    onEditStart, 
    onClear,
    isEditingTarget,
    originalText, // インポート画面でのみ使用：OCRで読み取られた原文
    confidence // インポート画面でのみ使用：'high', 'medium', 'low', 'manual'
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        ...styles
    };

    // インポート画面用のステータス表示
    const renderStatus = () => {
        if (!originalText) return null;
        
        if (song) {
            return (
                <div className="text-xs text-green-400 font-medium flex items-center gap-1.5 mt-0.5">
                    <Check size={12} />
                    <span className="truncate">{song.title}</span>
                </div>
            );
        } else {
            return (
                <div className="text-xs text-gray-400 italic flex items-center gap-1.5 mt-0.5">
                    <AlertCircle size={12} className="text-gray-600" />
                    <span>未選択...</span>
                </div>
            );
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onEditStart ? () => onEditStart(index) : undefined}
            className={`flex items-center gap-3 p-2 rounded border group transition-all ${
                isEditingTarget || isActive
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-900/10' 
                    : 'bg-slate-800 border-slate-700 hover:border-blue-500/50'
            } ${onEditStart ? 'cursor-pointer' : ''}`}
        >
            <div {...attributes} {...listeners} className="cursor-grab hover:text-white text-slate-600 flex items-center justify-center p-1">
                <GripVertical size={16} />
            </div>

            <div className={`w-6 text-center font-mono font-bold ${isEditingTarget || isActive ? 'text-blue-400' : 'text-slate-500'}`}>
                {index + 1}
            </div>

            <div className="flex-1 min-w-0">
                {originalText ? (
                    // インポートモード
                    <>
                        <div className="text-[10px] text-gray-500 truncate" title={originalText}>
                            {originalText}
                        </div>
                        {renderStatus()}
                    </>
                ) : (
                    // 通常のエディタモード
                    <div className="font-medium text-slate-200 truncate">
                        {song?.title || 'Unknown Song'}
                    </div>
                )}
            </div>

            <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {/* エディタ用の置換ボタン */}
                {onEditStart && !originalText && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEditStart(index); }}
                        className={`p-1.5 rounded transition-colors ${isEditingTarget ? 'bg-blue-500 text-white' : 'hover:bg-slate-700 text-slate-400 hover:text-blue-400'}`}
                        title="この曲を差し替える"
                    >
                        <Replace size={16} />
                    </button>
                )}

                {/* インポート用のクリアボタン */}
                {onClear && song && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                        title="紐付けを解除"
                    >
                        <X size={16} />
                    </button>
                )}

                {/* 削除ボタン */}
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                    className="p-1.5 hover:bg-red-900/50 rounded text-slate-400 hover:text-red-400"
                    title="削除"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default SetlistSortableItem;
