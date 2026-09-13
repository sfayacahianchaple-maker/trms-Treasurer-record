import { supabase } from '../lib/supabase';

export const fetchMonthlyDueSettings = async () => {
  const { data, error } = await supabase.from('monthly_due_settings').select('*').order('year', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const saveMonthlyDueSetting = async ({ year, monthly_amount }) => {
  const { data, error } = await supabase
    .from('monthly_due_settings')
    .upsert([{ year, monthly_amount }], { onConflict: 'year' })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const fetchMonthlyPayments = async ({ year, memberId }) => {
  let query = supabase.from('monthly_payments').select('*');
  if (year) query = query.eq('year', year);
  if (memberId) query = query.eq('member_id', memberId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const upsertMonthlyPayment = async ({ member_id, year, month, amount, paid, paid_date, recorded_by }) => {
  const { data, error } = await supabase
    .from('monthly_payments')
    .upsert([
      {
        member_id,
        year,
        month,
        amount,
        paid,
        paid_date,
        recorded_by,
      },
    ], { onConflict: 'member_id,year,month' })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const fetchAdditionalFeePayments = async ({ year, memberId, feeId }) => {
  let query = supabase.from('additional_fee_payments').select('*');
  if (year) {
    query = query.eq('year', year);
  }
  if (memberId) query = query.eq('member_id', memberId);
  if (feeId) query = query.eq('fee_id', feeId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const upsertAdditionalFeePayment = async ({ fee_id, member_id, amount, paid, paid_date, recorded_by }) => {
  const { data, error } = await supabase
    .from('additional_fee_payments')
    .upsert([
      {
        fee_id,
        member_id,
        amount,
        paid,
        paid_date,
        recorded_by,
      },
    ], { onConflict: 'fee_id,member_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getPaymentSummaryForMember = async (memberId) => {
  const { data, error } = await supabase
    .from('monthly_payments')
    .select('*')
    .eq('member_id', memberId)
    .order('year', { ascending: false })
    .order('month', { ascending: true });

  if (error) throw error;
  return data || [];
};
