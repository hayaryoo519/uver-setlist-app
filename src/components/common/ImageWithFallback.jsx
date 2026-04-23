import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';

/**
 * 画像読み込み中のスケルトン表示とエラー時のフォールバック機能を備えた共通コンポーネント
 * @param {Object} props
 * @param {string} props.src - 画像のURL
 * @param {string} props.alt - 代替テキスト
 * @param {string} props.className - 追加のCSSクラス
 * @param {string} props.fallbackType - エラー時のアイコンタイプ ("music" など)
 */
const ImageWithFallback = ({ src, alt, className = "", fallbackType = "music", isError: externalError = false }) => {
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [isInternalError, setIsInternalError] = useState(false);

    const isError = externalError || isInternalError;

    // 画像URLが確定した後のエラーチェック
    useEffect(() => {
        if (src) {
            setIsInternalError(false);
        }
    }, [src]);

    return (
        <div className={`relative overflow-hidden aspect-square flex items-center justify-center bg-slate-900 ${className}`}>
            {/* スケルトン表示 (読み込み中かつエラーでない場合) */}
            {!isImageLoaded && !isError && (
                <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
                    <div className="w-1/3 h-1/3 bg-slate-700/50 rounded-full"></div>
                </div>
            )}

            {/* エラー / フォールバック表示 */}
            {isError ? (
                <div className="flex flex-col items-center justify-center text-slate-700 w-full h-full bg-slate-900 opacity-0 animate-[fade-in_0.3s_ease-out_forwards]">
                    {fallbackType === "music" ? (
                        <Music size={40} strokeWidth={1.5} />
                    ) : (
                        <Music size={40} strokeWidth={1.5} />
                    )}
                </div>
            ) : (
                /* 実際の画像 */
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    className={`w-full h-full object-cover transition-opacity duration-700 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setIsImageLoaded(true)}
                    onError={() => {
                        setIsInternalError(true);
                        setIsImageLoaded(false);
                    }}
                />
            )}
        </div>
    );
};

export default ImageWithFallback;
