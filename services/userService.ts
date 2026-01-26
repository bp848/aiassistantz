import { supabase } from './supabaseClient';
import { UserProfile, SecretaryProfile } from '../types';

const STORAGE_KEY_USER = 'president_app_user';
const STORAGE_KEY_SEC = 'president_app_sec';

export const saveUserProfile = async (user: UserProfile, secretary: SecretaryProfile) => {
  // SECURITY: Never use localStorage - only Supabase with RLS
  if (!supabase) {
    console.warn('Supabase not available - cannot save profile');
    return;
  }

  try {
    // Get current authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      console.error('No authenticated user found:', authError);
      return;
    }

    console.log('Saving profile for authenticated user:', authUser.email);

    // Upsert using RLS-protected query with onConflict
    const payload = {
      user_id: authUser.id,
      profile: user,
      secretary_profile: secretary
    };

    const { error } = await supabase
      .from('user_settings')
      .upsert(payload, { 
        onConflict: 'user_id'
      });
    
    if (error) {
      console.error('Supabase save failed:', error);
    } else {
      console.log('Profile saved successfully for:', authUser.email);
    }
  } catch (e) {
    console.error('Supabase error:', e);
  }
};

export const getUserProfile = async (): Promise<{user: UserProfile, secretary: SecretaryProfile} | null> => {
  if (!supabase) {
    console.warn('Supabase not available');
    return null;
  }

  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      console.info('No authenticated user found');
      return null;
    }

    console.log('Getting profile for authenticated user:', authUser.email);

    // RLS automatically filters to user's own row
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (!error && data) {
      console.log('Found profile for:', data.profile.email);
      return {
        user: data.profile as UserProfile,
        secretary: data.secretary_profile as SecretaryProfile
      };
    } else if (error) {
      console.info('No profile found for user (expected for new users):', error.message);
    }

    // Fallback: return session data if no database record
    console.log('Returning fallback session data for:', authUser.email);
    return {
      user: {
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture,
        isConnectedGoogle: true,
        authProvider: 'google'
      },
      secretary: {
        name: '秘書',
        tone: 'professional',
        avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture
      }
    };
  } catch (e) {
    console.error('Supabase fetch error:', e);
  }

  return null;
};

export const clearUserProfile = async () => {
  // SECURITY: Only clear from Supabase - never localStorage
  if (!supabase) return;

  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await supabase
        .from('user_settings')
        .delete()
        .eq('user_id', authUser.id);
      console.log('Cleared profile for:', authUser.email);
    }
  } catch (e) {
    console.error('Supabase delete error:', e);
  }
};