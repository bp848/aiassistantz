-- Supabase スキーマ（実行用）
-- 実行順: Supabase Dashboard > SQL Editor で実行するか、supabase db push で適用
-- user_settings は auth.users を参照するため、Supabase Auth 有効化後に作成すること

-- LINE メッセージ
CREATE TABLE IF NOT EXISTS public.line_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'text'::text,
  timestamp timestamptz DEFAULT now(),
  processed boolean DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT line_messages_pkey PRIMARY KEY (id)
);

-- LINE ユーザー
CREATE TABLE IF NOT EXISTS public.line_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  display_name text NOT NULL,
  picture_url text,
  status_message text,
  followed_at timestamptz DEFAULT now(),
  unfollowed_at timestamptz,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT line_users_pkey PRIMARY KEY (id)
);

-- ユーザー設定（auth.users を参照。Supabase Auth 利用時のみ書き込み可能）
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  id uuid DEFAULT gen_random_uuid(),
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  secretary_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT user_settings_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- RLS 有効化
ALTER TABLE public.line_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- user_settings: 自分の行のみ読み書き可能（Supabase Auth 利用時）
-- 2回目実行時は「policy already exists」になる場合は DROP POLICY してから再実行
CREATE POLICY "Users can read own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON public.user_settings
  FOR DELETE USING (auth.uid() = user_id);
