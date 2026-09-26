import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizePhilippineMobile(phone: string) {
  const compact = phone.trim().replace(/[\s().-]/g, '');
  const digits = compact.startsWith('+') ? compact.slice(1) : compact;
  const normalized = digits.startsWith('09') ? `63${digits.slice(1)}` : digits;
  return /^639\d{9}$/.test(normalized) ? normalized : null;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function createMessage(payment: Record<string, unknown>) {
  const memberName = String(payment.member_name).trim().slice(0, 40);
  const amount = `₱${formatAmount(Number(payment.amount))}`;

  if (payment.payment_type === 'monthly') {
    return `TRMS PAYMENT NOTICE: Hello ${memberName}! Your ${payment.month_name} ${payment.year} membership payment of ${amount} was recorded. Thank you!`;
  }

  const feeName = String(payment.fee_name).trim().slice(0, 45);
  return `TRMS PAYMENT NOTICE: Hello ${memberName}! Your ${amount} payment for ${feeName} was recorded. Thank you!`;
}

function hasProviderError(payload: unknown) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const result = payload as Record<string, unknown>;
    if (result.error || result.success === false) return true;
    if (typeof result.status === 'string' && /failed|error|rejected/i.test(result.status)) return true;
  }

  if (Array.isArray(payload)) {
    return payload.length === 0 || payload.some((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      return /failed|error|rejected/i.test(String((entry as Record<string, unknown>).status || ''));
    });
  }

  return false;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond(405, { status: 'failed', error: 'Method not allowed.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const semaphoreApiKey = Deno.env.get('SEMAPHORE_API_KEY');
  const authorization = request.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return respond(401, { status: 'failed', error: 'Authentication or server configuration is missing.' });
  }

  try {
    const input = await request.json();
    const memberId = Number(input.member_id);
    const year = Number(input.year);
    const paymentType = input.payment_type;
    if (!Number.isSafeInteger(memberId) || memberId < 1 || !Number.isInteger(year)
      || !['monthly', 'additional'].includes(paymentType)) {
      return respond(400, { status: 'failed', error: 'Invalid payment information.' });
    }

    const token = authorization.replace(/^Bearer\s+/i, '');
    const callerClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
    const { data: userResult, error: authError } = await callerClient.auth.getUser(token);
    if (authError || !userResult.user) return respond(401, { status: 'failed', error: 'Invalid session.' });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, zone_id')
      .eq('id', userResult.user.id)
      .maybeSingle();
    if (profileError || !profile || !['admin', 'zone_treasurer'].includes(profile.role)) {
      return respond(403, { status: 'failed', error: 'Not authorized to record this payment.' });
    }

    const { data: member, error: memberError } = await adminClient
      .from('members')
      .select('id, name, phone, zone_id')
      .eq('id', memberId)
      .maybeSingle();
    if (memberError || !member) return respond(404, { status: 'failed', error: 'Member not found.' });
    if (profile.role === 'zone_treasurer' && Number(profile.zone_id) !== Number(member.zone_id)) {
      return respond(403, { status: 'failed', error: 'Not authorized for this member zone.' });
    }

    let paymentKey: string;
    let amount: number;
    let monthName = '';
    let feeName = '';

    if (paymentType === 'monthly') {
      const month = String(input.month || '');
      const monthNames: Record<string, string> = {
        Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
        May: 'May', Jun: 'June', Jul: 'July', Aug: 'August',
        Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
      };
      if (!monthNames[month]) return respond(400, { status: 'failed', error: 'Invalid payment month.' });
      const { data: payment, error: paymentError } = await adminClient
        .from('monthly_payments')
        .select('amount, paid')
        .eq('member_id', memberId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      if (paymentError || !payment?.paid) return respond(409, { status: 'failed', error: 'Payment is not recorded as paid.' });
      paymentKey = `monthly:${memberId}:${year}:${month}`;
      amount = Number(payment.amount);
      monthName = monthNames[month];
    } else {
      const feeId = String(input.fee_id || '').trim();
      if (!feeId || feeId.length > 128) return respond(400, { status: 'failed', error: 'Invalid fee.' });
      const { data: payment, error: paymentError } = await adminClient
        .from('additional_fee_payments')
        .select('amount, paid')
        .eq('fee_id', feeId)
        .eq('member_id', memberId)
        .eq('year', year)
        .maybeSingle();
      const { data: fee, error: feeError } = await adminClient
        .from('additional_fees')
        .select('name, year')
        .eq('id', feeId)
        .maybeSingle();
      if (paymentError || feeError || !payment?.paid || !fee || Number(fee.year) !== year) {
        return respond(409, { status: 'failed', error: 'Additional fee payment is not recorded as paid.' });
      }
      paymentKey = `additional:${feeId}:${memberId}:${year}`;
      amount = Number(payment.amount);
      feeName = fee.name;
    }

    if (!Number.isFinite(amount) || amount < 0) return respond(400, { status: 'failed', error: 'Invalid payment amount.' });
    const message = createMessage({
      payment_type: paymentType,
      member_name: member.name,
      year,
      month_name: monthName,
      fee_name: feeName,
      amount,
    });
    const rawPhone = String(member.phone || '').trim();
    const phone = rawPhone ? normalizePhilippineMobile(rawPhone) : null;

    const { data: log, error: logError } = await adminClient
      .from('sms_logs')
      .insert({
        member_id: memberId,
        phone: rawPhone,
        message,
        status: rawPhone ? 'pending' : 'no_phone',
        payment_key: paymentKey,
      })
      .select('id')
      .single();

    if (logError?.code === '23505') {
      return respond(200, { status: 'duplicate', message: 'SMS was already processed for this payment.' });
    }
    if (logError || !log) return respond(500, { status: 'failed', error: 'Unable to create SMS log.' });
    if (!rawPhone) return respond(200, { status: 'no_phone' });

    if (!phone || !semaphoreApiKey) {
      await adminClient.from('sms_logs').update({
        status: 'failed',
        provider_response: { error: phone ? 'Semaphore API key is not configured.' : 'Invalid Philippine mobile number.' },
      }).eq('id', log.id);
      return respond(200, { status: 'failed' });
    }

    let semaphoreResponse: Response;
    try {
      semaphoreResponse = await fetch('https://api.semaphore.co/api/v4/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ apikey: semaphoreApiKey, number: phone, message }),
      });
    } catch (error) {
      await adminClient.from('sms_logs').update({
        status: 'failed',
        provider_response: { error: error instanceof Error ? error.message : 'Semaphore request failed.' },
      }).eq('id', log.id);
      return respond(200, { status: 'failed' });
    }
    const responseText = await semaphoreResponse.text();
    let providerResponse: unknown = responseText;
    try {
      providerResponse = JSON.parse(responseText);
    } catch {
      // Keep non-JSON provider responses in the log for diagnosis.
    }

    const sent = semaphoreResponse.ok && !hasProviderError(providerResponse);
    await adminClient.from('sms_logs').update({
      status: sent ? 'sent' : 'failed',
      provider_response: providerResponse,
    }).eq('id', log.id);

    return respond(200, { status: sent ? 'sent' : 'failed' });
  } catch (error) {
    console.error('send-payment-sms failed.', error);
    return respond(500, { status: 'failed', error: 'Unable to send payment notification.' });
  }
});