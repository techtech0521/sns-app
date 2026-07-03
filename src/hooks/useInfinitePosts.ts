import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useInfiniteScroll } from "./useInfiniteScroll";
import type { Database } from "../types/database.types";

type Post = Database["public"]["Tables"]["posts"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface PostWithProfile extends Post {
    profiles: Profile;
    comments?: { id: string }[];
    likes?: { id: string; user_id: string }[];
}

interface UseInfinitePostResult {
    /** 投稿リスト */
    posts: PostWithProfile[];
    /** 初回ロード中かどうか */
    loading: boolean;
    /** 追加ロード中かどうか */
    loadingMore: boolean;
    /** 更にデータがあるかどうか */
    hasMore: boolean;
    /** 次ページを読み込む関数 */
    loadMore: () => Promise<void>;
    /** Intersection Observer 用ref */
    observerRef: (node: HTMLElement | null) => void;
    /** エラーメッセージ */
    error: string;
}

/** 1回のロード件数 */
const POSTS_PER_PAGE = 10;

/**
 * 投稿の無限スクロールロジックを管理するカスタムフック
 * 
 * @param filterType - フィルタタイプ（"alt" または "following"）
 * @param refreshTrigger - 更新トリガー（変更時にリセット）
 * @param userId - ユーザーID（followingフィルタ時使用）
 * @returns 無限スクロールの状態と関数
 */
export function useInfinitePosts(
    filterType: "all" | "following",
    refreshTrigger: number
) : UseInfinitePostResult {
    const { user } = useAuth();

    // 状態管理
    const [posts, setPosts] = useState<PostWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState("");
    const lastCreatedAtRef = useRef<string | null>(null);
    const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(null);

    // 全体の投稿を取得
    const fetchAllPosts = useCallback(async (isLoadMore = false) => {
        console.log(`[fetchAllPosts] 開始: isLoadMore=${isLoadMore}`);
        try {
            if (isLoadMore) {
                setLoadingMore(true);
            } else {
                setLoading(true);
                setPosts([]);
                setLastCreatedAt(null);
                lastCreatedAtRef.current = null;
                setHasMore(true);
            }

            let query = supabase
                .from("posts")
                .select(
                    `
                    *,
                    profiles (*),
                    comments (id),
                    likes (id, user_id)
                `
                )
                .order("created_at", { ascending: false })
                .limit(POSTS_PER_PAGE);

            // 追加ロード時はカーソルを使用
            if (isLoadMore && lastCreatedAtRef.current) {
                query = query.lt("created_at", lastCreatedAtRef.current);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            const newPosts = (data as PostWithProfile[]) || [];

            if (isLoadMore) {
                // 追加ロード: 既存の投稿に追加
                console.log(`[fetchAllPosts] 追加ロード: 現在${newPosts.length}件を追加`);
                setPosts((prev) => [...prev, ...newPosts]);
            } else {
                // 初回ロード
                console.log(`[fetchAllPosts] 初回ロード: ${newPosts.length}件をセット`);
                setPosts(newPosts);
            }

            // 取得件数がリクエスト件数より少ない場合、これ以上データはない
            setHasMore(newPosts.length === POSTS_PER_PAGE);
            console.log(`[fetchAllPosts] 取得: ${newPosts.length}件, hasMore: ${newPosts.length === POSTS_PER_PAGE}, isLoadMore: ${isLoadMore}`);

            // 最後の投稿のcreated_atを保存（次ページのカーソル）
            if (newPosts.length > 0) {
                console.log(`[fetchAllPosts] 最新の投稿ID: ${newPosts[0].id}, 作成日時: ${newPosts[0].created_at}`);
                const lastPost = newPosts[newPosts.length - 1];
                setLastCreatedAt(lastPost.created_at);
                lastCreatedAtRef.current = lastPost.created_at;
            }
        } catch (err) {
            console.error("投稿取得エラー:", err);
            setError("投稿の読み込みに失敗しました");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    // フォロー中のユーザーの投稿を取得
    const fetchFollowingPosts = useCallback(async(isLoadMore = false) => {
        try {
            if (!user) {
                setPosts([]);
                setHasMore(false);
                setLoading(false);
                return;
            }

            if (isLoadMore) {
                setLoadingMore(true)
            } else {
                setLoading(true);
                setPosts([]);
                setLastCreatedAt(null);
                setHasMore(true);
            }

            // フォローしているユーザーのIDを取得
            const { data: follows, error: followsError } = await supabase
                .from("follows")
                .select("following_id")
                .eq("follower_id", user.id);

            if (followsError) throw followsError;

            const followingIds = (follows as { following_id: string }[])?.map((f) => f.following_id) || [];

            // フォローしているユーザーがいない場合
            if (followingIds.length === 0) {
                setPosts([]);
                setHasMore(false);
                setLoading(false);
                setLoadingMore(false);
                return;
            }

            let query = supabase
                .from("posts")
                .select(
                    `
                    *,
                    profiles (*),
                    comments (id),
                    likes (id, user_id)
                `
                )
                .in("user_id", followingIds)
                .order("created_at", { ascending: false })
                .limit(POSTS_PER_PAGE);

            // 追加ロード時はカーソルを使用
            if (isLoadMore && lastCreatedAt) {
                query = query.lt("created_at", lastCreatedAt);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            const newPosts = (data as PostWithProfile[]) || [];

            if (isLoadMore) {
                setPosts((prev) => [...prev, ...newPosts]);
            } else {
                setPosts(newPosts);
            }

            setHasMore(newPosts.length === POSTS_PER_PAGE);
            console.log(`[fetchFollowingPosts] 取得: ${newPosts.length}件, hasMore: ${newPosts.length === POSTS_PER_PAGE}, isLoadMore: ${isLoadMore}`);
            if (newPosts.length > 0) {
                const lastPost = newPosts[newPosts.length - 1];
                setLastCreatedAt(lastPost.created_at);
            }
        } catch (err) {
            console.error("投稿取得エラー:", err);
            setError("投稿の読み込みに失敗しました");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [user]);

    // 次ページを読み込む関数
    const loadMore = useCallback(async () => {
        console.log(`[loadMore] 呼び出され: loadingMore=${loadingMore}, hasMore=${hasMore}`);
        if (loadingMore || !hasMore) {
            console.log(`[loadMore] キャンセル: loadingMore=${loadingMore}, hasMore=${hasMore}`);
            return;
        }

        if (filterType === "following") {
            await fetchFollowingPosts(true);
        } else {
            await fetchAllPosts(true);
        }
    }, [loadingMore, hasMore, filterType, fetchAllPosts, fetchFollowingPosts]);

    // 初回読み込みと更新トリガー
    useEffect(() => {
        console.log(`[useEffect] refreshTrigger=${refreshTrigger}, filterType=${filterType}`);
        if (filterType === "following") {
            console.log(`[useEffect] fetchFollowingPosts を呼び出し`);
            fetchFollowingPosts(false);
        } else {
            console.log(`[useEffect] fetchAllPosts を呼び出し`);
            fetchAllPosts(false);
        }
    }, [refreshTrigger, filterType]);

    // Intersection Observer用の ref
    const observerRef = useInfiniteScroll(hasMore && !loading, loadMore, {
        threshold: 0.1,
        rootMargin: "100px",
    });

    console.log(`[useInfinitePosts] return: posts=${posts.length}件, 最新投稿ID=${posts.length > 0 ? posts[0].id : 'なし'}`);
    return {
        posts,
        loading,
        loadingMore,
        hasMore,
        loadMore,
        observerRef,
        error,
    };
}