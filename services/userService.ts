import { supabase } from './supabaseClient';
import { UserProfile, SecretaryProfile } from '../types';

const STORAGE_KEY_USER = 'president_app_user';
const STORAGE_KEY_SEC = 'president_app_sec';

/**
 * user_settings テーブル仕様:
 * - PK: user_id (uuid), FK → auth.users(id)
 * - profile (jsonb), secretary_profile (jsonb), settings (jsonb), updated_at
 * Supabase Auth セッションがあるときのみ DB に書き込む。ないときは localStorage のみ。
 */

export const saveUserProfile = async (user: UserProfile, secretary: SecretaryProfile) => {
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEY_SEC, JSON.stringify(secretary));

  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (userId) {
        const { error } = await supabase.from('user_settings').upsert(
          {
            user_id: userId,
            profile: user,
            secretary_profile: secretary,
            settings: {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
        if (error) {
          console.warn('Supabase save failed (table/RLS?), using localStorage only:', error.message);
        }
      }
    } catch (e) {
      console.warn('Supabase error:', e);
    }
  }
};

export const getUserProfile = async (): Promise<{ user: UserProfile; secretary: SecretaryProfile } | null> => {
  const localUser = localStorage.getItem(STORAGE_KEY_USER);
  const localSec = localStorage.getItem(STORAGE_KEY_SEC);

  if (localUser && localSec) {
    try {
      return {
        user: JSON.parse(localUser),
        secretary: JSON.parse(localSec),
      };
    } catch (e) {
      console.error('Local storage parse error', e);
    }
  }

  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (userId) {
        const { data, error } = await supabase
          .from('user_settings')
          .select('profile, secretary_profile')
          .eq('user_id', userId)
          .single();

        if (!error && data?.profile && data?.secretary_profile) {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.profile));
          localStorage.setItem(STORAGE_KEY_SEC, JSON.stringify(data.secretary_profile));
          return {
            user: data.profile as UserProfile,
            secretary: data.secretary_profile as SecretaryProfile,
          };
        }
      }
    } catch (e) {
      console.warn('Supabase fetch error:', e);
    }
  }

  return null;
};

export const clearUserProfile = async () => {
  localStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_SEC);
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (userId) {
        await supabase.from('user_settings').delete().eq('user_id', userId);
      }
    } catch (e) {
      console.warn('Supabase delete failed (table might not exist):', e);
    }
  }
};
