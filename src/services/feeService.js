import { supabase } from '../lib/supabase';

export const fetchAdditionalFees = async (year = null) => {
  let query = supabase.from('additional_fees').select('*');
  if (year) query = query.eq('year', year);
  const { data, error } = await query.order('fee_name');
  if (error) throw error;
  return data || [];
};

export const createAdditionalFee = async (fee) => {
  const { data, error } = await supabase.from('additional_fees').insert([fee]).select().single();
  if (error) throw error;
  return data;
};

export const updateAdditionalFee = async (id, fee) => {
  const { data, error } = await supabase.from('additional_fees').update(fee).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteAdditionalFee = async (id) => {
  const { error } = await supabase.from('additional_fees').delete().eq('id', id);
  if (error) throw error;
};

export const fetchFeePayments = async () => {
  const { data, error } = await supabase.from('additional_fee_payments').select('*');
  if (error) throw error;
  return data || [];
};
