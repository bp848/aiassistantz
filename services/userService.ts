import { supabase } from './supabaseClient';
import { UserProfile, SecretaryProfile } from '../types';

const STORAGE_KEY_USER = 'president_app_user';
const STORAGE_KEY_SEC = 'president_app_sec';

// Supabase table assumed to be 'user_settings' with columns: id (text), profile (jsonb), secretary_profile (jsonb)
// We use a fixed ID 'current_user' for this single-user demo context

export const saveUserProfile = async (user: UserProfile, secretary: SecretaryProfile) => {
  // Always save to local storage for offline/fast access
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEY_SEC, JSON.stringify(secretary));

  if (supabase) {
    try {
      // Upsert to Supabase
      const { error } = await supabase.from('user_settings').upsert({
        id: 'current_user',
        profile: user,
        secretary_profile: secretary,
        updated_at: new Date()
      });
      
      if (error) {
        console.warn('Supabase save failed (table might not exist), using localStorage only:', error.message);
      }
    } catch (e) {
      console.warn('Supabase error:', e);
    }
  }
};

export const getUserProfile = async (): Promise<{user: UserProfile, secretary: SecretaryProfile} | null> => {
  // 1. Try Local Storage first
  const localUser = localStorage.getItem(STORAGE_KEY_USER);
  const localSec = localStorage.getItem(STORAGE_KEY_SEC);

  if (localUser && localSec) {
    try {
      return { 
        user: JSON.parse(localUser), 
        secretary: JSON.parse(localSec) 
      };
    } catch (e) {
      console.error('Local storage parse error', e);
    }
  }

  // 2. Try Supabase if no local data
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', 'current_user')
        .single();

      if (!error && data) {
        // Update local storage to match cloud
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.profile));
        localStorage.setItem(STORAGE_KEY_SEC, JSON.stringify(data.secretary_profile));
        
        return {
          user: data.profile as UserProfile,
          secretary: data.secretary_profile as SecretaryProfile
        };
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
    await supabase.from('user_settings').delete().eq('id', 'current_user');
  }
};