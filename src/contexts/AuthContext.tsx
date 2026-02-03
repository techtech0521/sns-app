import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;
        let initialAuthHandled = false;

        // 認証状態変更の監視を先に設定
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {

            // 初期認証（ページロード時）は getSession で処理するため、INITIAL_SESSION まではスキップ
            if (!initialAuthHandled) {
                if (event === 'INITIAL_SESSION') {
                    initialAuthHandled = true;
                }
                return;
            }

            if (ignore) return;

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                try {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    if (!ignore) {
                        setProfile(profileData);
                    }
                } catch (err) {
                    console.error('>>> プロフィール取得エラー (onAuthStateChange):', err);
                }
            } else {
                if (!ignore) {
                    setProfile(null);
                }
            }
        });

        // 初期セッション取得
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (ignore) return;

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                try {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    if (!ignore) {
                        setProfile(profileData);
                    }
                } catch (err) {
                    console.error('>>> プロフィール取得エラー (getSession):', err);
                }
            }

            if (!ignore) {
                setLoading(false);
            } else {
            }
        });

        return () => {
            ignore = true;
            subscription.unsubscribe();
        };
    }, []);

    const refreshProfile = async () => {
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            setProfile(data);
        }
    };

    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error };
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const value = {
        user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}