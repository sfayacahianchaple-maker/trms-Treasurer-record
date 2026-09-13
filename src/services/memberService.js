import { supabase } from '../lib/supabase';

export const fetchMembers = async () => {
  const { data, error } = await supabase.from('members').select('*').order('full_name');
  if (error) throw error;
  return data || [];
};

export const fetchMembersByZone = async (zoneId) => {
  const { data, error } = await supabase.from('members').select('*').eq('zone_id', zoneId).order('full_name');
  if (error) throw error;
  return data || [];
};

export const createMember = async (member) => {
  const { data, error } = await supabase.from('members').insert([member]).select().single();
  if (error) throw error;
  return data;
};

export const updateMember = async (id, member) => {
  const { data, error } = await supabase.from('members').update(member).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteMember = async (id) => {
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) throw error;
};

export const fetchMemberById = async (id) => {
  const { data, error } = await supabase.from('members').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
};
