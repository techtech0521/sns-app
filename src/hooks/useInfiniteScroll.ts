import { useEffect, useState } from 'react';
import type { RefCallback } from 'react';

interface UseInfiniteScrollOptions {
    /** 要素がどの程度見えたら発火するか（0-1） */
    threshold?: number;
    /** ルートマージン（CSS形式） */
    rootMargin?: string;
}

/**
 * Intersection Observer を管理するカスタムフック
 * 
 * @param hasNext - まだデータがあるかどうか。falseの時はobserveしない
 * @param onLoadMore - 次ページを読み込む関数
 * @param options - オプション設定
 * @returns ref - 監視対象の要素にアタッチするrefコールバック
 */
export function useInfiniteScroll(
    hasNext: boolean,
    onLoadMore: () => void,
    options: UseInfiniteScrollOptions = {}
): RefCallback<HTMLElement> {
    const { threshold = 0.1, rootMargin = '100px' } = options;
    const [node, setNode] = useState<HTMLElement | null>(null);

    useEffect(() => {
        console.log(`[useInfiniteScroll] hasNext=${hasNext}, node=${node ? 'あり' : 'なし'}`);
        // データがない、または監視対象の要素がない場合は何もしない
        if (!hasNext || !node) {
            console.log(`[useInfiniteScroll] キャンセル: hasNext=${hasNext}, node=${node}`);
            return;
        }
        console.log(`[useInfiniteScroll] Observer を開始`);

        // Intersection Observer の作成
        const observer = new IntersectionObserver(
            (entries) => {
                console.log(`[useInfiniteScroll] 要素が交差: isIntersecting=${entries[0].isIntersecting}`);
                // 最初のエントリ（監視対象要素）が交差したら
                if (entries[0].isIntersecting) {
                    console.log(`[useInfiniteScroll] 追加ロードを発火`);
                    // 次ページを読み込む
                    onLoadMore();
                }
            },
            {
                threshold,
                rootMargin,
            }
        );

        // 監視を開始
        observer.observe(node);

        // クリーンアップ: 監視を停止
        return () => {
            observer.disconnect();
        };
    }, [hasNext, node, threshold, rootMargin, onLoadMore]);

    // refコールバックを返す
    return setNode;
}