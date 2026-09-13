import { supabase } from '../lib/supabase';

export const signIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getCurrentUserProfile = async () => {
  const session = await getSession();
  if (!session?.user) return null;
  return getProfile(session.user.id);
};

export const createProfile = async ({ id, full_name, email, role, zone_id = null }) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert([{ id, full_name, email, role, zone_id }], { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
};

const getSupabaseAuthErrorMessage = (error) => {
  const message = error?.message || '';

  if (message.toLowerCase().includes('rate limit')) {
    return 'Supabase email rate limit exceeded. Go to Authentication > Providers > Email in your Supabase dashboard and disable email confirmation for testing, or configure custom SMTP.';
  }

  if (message.toLowerCase().includes('confirmation') || message.toLowerCase().includes('verify')) {
    return 'Email confirmation is enabled in Supabase. For testing, disable email confirmation in Authentication > Providers > Email, or configure custom SMTP.';
  }

  if (message.toLowerCase().includes('already registered') || message.toLowerCase().includes('user already')) {
    return 'This email already has a Supabase account. Use a different email address for the treasurer.';
  }

  return message || 'Treasurer account could not be created.';
};

export const createTreasurerUser = async ({ full_name, email, password, zone_id }) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      throw new Error(getSupabaseAuthErrorMessage(authError));
    }

    if (!authData?.user) {
      throw new Error('Treasurer account could not be created.');
    }

    const profile = await createProfile({
      id: authData.user.id,
      full_name,
      email,
      role: 'zone_treasurer',
      zone_id,
    });

    if (profile?.zone_id) {
      await supabase
        .from('profiles')
        .update({ zone_id: null })
        .eq('role', 'zone_treasurer')
        .eq('zone_id', Number(profile.zone_id))
        .neq('id', authData.user.id);

      await supabase
        .from('zones')
        .update({ treasurer_id: null })
        .eq('treasurer_id', authData.user.id)
        .neq('id', Number(profile.zone_id));

      const { error: zoneError } = await supabase
        .from('zones')
        .update({ treasurer_id: authData.user.id })
        .eq('id', Number(profile.zone_id));

      if (zoneError) {
        throw new Error('Treasurer account created, but zone assignment failed.');
      }
    }

    return authData.user;
  } catch (error) {
    const message = error?.message || 'Treasurer account could not be created.';
    throw new Error(message);
  }
};
