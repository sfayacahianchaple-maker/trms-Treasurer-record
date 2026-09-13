import { supabase } from '../lib/supabase';

export const fetchZones = async () => {
  const { data, error } = await supabase.from('zones').select('*').order('zone_name');
  if (error) throw error;
  return data || [];
};

export const fetchZoneById = async (id) => {
  const { data, error } = await supabase.from('zones').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
};

export const createZone = async (zoneName) => {
  const { data, error } = await supabase.from('zones').insert([{ zone_name: zoneName }]).select().single();
  if (error) throw error;
  return data;
};

export const updateZone = async (id, zoneName) => {
  const { data, error } = await supabase.from('zones').update({ zone_name: zoneName }).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteZone = async (id) => {
  const { error } = await supabase.from('zones').delete().eq('id', id);
  if (error) throw error;
};

export const assignTreasurerToZone = async (zoneId, treasurerId) => {
  const { data, error } = await supabase
    .from('zones')
    .update({ treasurer_id: treasurerId })
    .eq('id', zoneId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const fetchZoneTreasurerProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'zone_treasurer')
    .order('full_name');

  if (error) throw error;
  return data || [];
};

export const syncTreasurerZoneAssignments = async () => {
  const { data: treasurers, error: treasurerError } = await supabase
    .from('profiles')
    .select('id, zone_id')
    .eq('role', 'zone_treasurer');

  if (treasurerError) throw treasurerError;

  for (const treasurer of treasurers || []) {
    if (!treasurer.zone_id) {
      const { error } = await supabase
        .from('zones')
        .update({ treasurer_id: null })
        .eq('treasurer_id', treasurer.id);

      if (error) throw error;
      continue;
    }

    const { error: clearError } = await supabase
      .from('zones')
      .update({ treasurer_id: null })
      .eq('treasurer_id', treasurer.id)
      .neq('id', Number(treasurer.zone_id));

    if (clearError) throw clearError;

    const { error: assignError } = await supabase
      .from('zones')
      .update({ treasurer_id: treasurer.id })
      .eq('id', Number(treasurer.zone_id));

    if (assignError) throw assignError;
  }
};
