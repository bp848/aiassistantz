import { supabase } from './supabaseClient';
import { StoredDocument } from '../types';

const BUCKET_NAME = 'documents';

// Helper to sanitize keys for Supabase Storage
// Replaces spaces with underscores and removes characters outside [A-Za-z0-9._-]
// Also normalizes unicode to avoid composition issues
function toSafeKey(file: File): string {
  const safeBase = file.name
    .normalize('NFKC')
    .replace(/\s+/g, '_')       // Replace whitespace with underscores
    .replace(/[^\w.\-]/g, '');  // Remove non-alphanumeric (except . - _)
  
  // If the filename becomes empty (e.g. was only emojis), use a default
  const finalBase = safeBase || 'document';

  // Prefix with timestamp to ensure uniqueness and simple ordering
  return `${Date.now()}_${finalBase}`;
}

export const uploadDocument = async (file: File): Promise<StoredDocument | null> => {
  // 1. Try Supabase Storage
  if (supabase) {
    try {
      const fileName = toSafeKey(file);

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          upsert: false
        });

      if (error) {
        console.warn('Supabase upload failed:', error.message);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      const doc: StoredDocument = {
        id: fileName,
        name: file.name,
        url: publicUrl,
        uploadedAt: new Date(),
        size: file.size
      };

      return doc;
    } catch (e) {
      console.warn('Upload failed:', e);
      return null;
    }
  }

  return null;
};

export const listDocuments = async (): Promise<StoredDocument[]> => {
  if (supabase) {
    try {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).list();
      if (!error && data) {
         return data.map(f => {
            const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(f.name);
            // Remove timestamp prefix for display logic if desired, or keep as is.
            // Here we remove the timestamp prefix we added for cleaner display.
            const displayName = f.name.replace(/^\d+_/, '');
            
            return {
              id: f.name,
              name: displayName || f.name,
              url: publicUrl,
              uploadedAt: new Date(f.created_at || Date.now()),
              size: f.metadata?.size || 0
            };
         });
      }
    } catch (e) {
      console.warn('Supabase list error:', e);
    }
  }

  return [];
};
