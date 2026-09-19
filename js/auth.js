/* TRMS — Supabase-ready authentication and data store.
   The app no longer uses demo seed data. Configure your real project URL and
   anon key in js/config.js before using the app. */
(function () {
  const CONFIG = window.TRMS_CONFIG || {};

  function isSupabaseConfigured() {
    return !!(
      CONFIG.supabaseUrl &&
      CONFIG.supabaseUrl !== 'https://YOUR_PROJECT_REF.supabase.co' &&
      CONFIG.supabaseAnonKey &&
      CONFIG.supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY'
    );
  }

  let supabaseLoader = null;

  async function ensureSupabaseClient() {
    if (!isSupabaseConfigured()) {
      return null;
    }

    if (!window.supabase || !window.supabase.createClient) {
      if (!supabaseLoader) {
        supabaseLoader = new Promise((resolve, reject) => {
          const existingScript = document.querySelector('script[data-trms-supabase-loader]');
          const script = existingScript || document.createElement('script');

          script.onload = resolve;
          script.onerror = () => reject(new Error('Unable to load Supabase.'));

          if (!existingScript) {
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.async = true;
            script.dataset.trmsSupabaseLoader = 'true';
            document.head.appendChild(script);
          }
        });
      }

      await supabaseLoader;
    }

    return window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
  }

  function emptyDataSet() {
    return {
      zones: [],
      members: [],
      profiles: [],
      monthlyDue: { year: new Date().getFullYear(), monthly_amount: 0, yearly_due: 0, active_threshold: 0 },
      monthlyPayments: [],
      additionalFees: [],
      additionalFeePayments: [],
      monthlyDueSettings: []
    };
  }

  function getMockData() {
    if (!isSupabaseConfigured()) {
      return emptyDataSet();
    }

    const cached = localStorage.getItem('trms_supabase_cache_v1');
    if (!cached) {
      return emptyDataSet();
    }

    try {
      return JSON.parse(cached);
    } catch (err) {
      return emptyDataSet();
    }
  }

  function saveMockData(data) {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase is not configured. Set your project URL and anon key in js/config.js.');
      return;
    }

    localStorage.setItem('trms_supabase_cache_v1', JSON.stringify(data || emptyDataSet()));
  }

  function resetMockData() {
    localStorage.removeItem('trms_supabase_cache_v1');
    return emptyDataSet();
  }

  function showAlert(message) {
    const existing = document.getElementById('trmsAlert');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'trmsAlert';
    overlay.className = 'modal-overlay trms-alert-overlay';
    overlay.innerHTML = `
      <section class="modal-card trms-alert-card" role="alertdialog" aria-modal="true" aria-labelledby="trmsAlertTitle">
        <div class="page-header">
          <div>
            <p class="eyebrow">TRMS Notification</p>
            <h2 id="trmsAlertTitle">Please check this</h2>
          </div>
          <button type="button" class="modal-close" data-alert-close aria-label="Close notification">&times;</button>
        </div>
        <p class="trms-alert-message"></p>
        <div class="modal-actions">
          <button type="button" class="btn btn-primary" data-alert-close>OK</button>
        </div>
      </section>
    `;
    overlay.querySelector('.trms-alert-message').textContent = String(message || 'Something needs your attention.');
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelectorAll('[data-alert-close]').forEach((button) => button.addEventListener('click', close));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });
    overlay.querySelector('[data-alert-close]').focus();
  }

  async function login({ email, password }) {
    const client = await ensureSupabaseClient();
    if (!client) {
      return {
        success: false,
        message: 'Supabase is not configured yet. Add your project URL and anon key in js/config.js.'
      };
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: (email || '').trim(),
      password: password || ''
    });

    if (error) {
      return { success: false, message: error.message || 'Login failed.' };
    }

    const metadata = data.user?.user_metadata || {};
    const appMeta = data.user?.app_metadata || {};

    let profile = null;
    if (data.user?.id) {
      const { data: profileRow, error: profileError } = await client
        .from('profiles')
        .select('id, name, email, role, zone_id, username')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        await client.auth.signOut();
        return {
          success: false,
          message: `Unable to load your profile: ${profileError.message || 'database access failed.'}`
        };
      }

      if (profileRow) {
        profile = profileRow;
      }
    }

    const role = String(profile?.role || metadata.role || appMeta.role || 'zone_treasurer')
      .trim()
      .toLowerCase();
    const session = {
      id: data.user?.id || null,
      name: profile?.name || metadata.full_name || metadata.name || data.user?.email || 'User',
      role,
      zone_id: profile?.zone_id ?? metadata.zone_id ?? null
    };

    localStorage.setItem(CONFIG.sessionKey, JSON.stringify(session));
    return { success: true, user: session };
  }

  async function logout() {
    const client = await ensureSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    localStorage.removeItem(CONFIG.sessionKey);
  }

  function getCurrentUser() {
    const raw = localStorage.getItem(CONFIG.sessionKey || 'trms_session_v1');
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  async function hydrateSupabaseCache() {
    if (!isSupabaseConfigured()) {
      localStorage.removeItem('trms_supabase_cache_v1');
      return;
    }

    const client = await ensureSupabaseClient();
    if (!client) {
      return;
    }

    const tables = ['zones', 'members', 'profiles', 'monthly_due_settings', 'monthly_payments', 'additional_fees', 'additional_fee_payments'];
    const data = {};

    for (const table of tables) {
      const { data: rows, error } = await client.from(table).select('*');
      if (!error) {
        data[table.replace('monthly_due_settings', 'monthlyDue')] = rows || [];
      }
    }

    const monthlyDueSettings = Array.isArray(data.monthlyDue) ? data.monthlyDue : [];
    const currentYear = new Date().getFullYear();
    const monthlyDue = monthlyDueSettings.find((setting) => Number(setting.year) === currentYear)
      || monthlyDueSettings[0]
      || { year: currentYear, monthly_amount: 0, yearly_due: 0, active_threshold: 0 };
    const profiles = data.profiles || [];
    const zones = data.zones || [];
    const members = data.members || [];
    const monthlyPayments = data.monthly_payments || [];
    const additionalFees = data.additional_fees || [];
    const additionalFeePayments = data.additional_fee_payments || [];

    localStorage.setItem('trms_supabase_cache_v1', JSON.stringify({
      zones,
      members,
      profiles,
      monthlyDue,
      monthlyDueSettings,
      monthlyPayments,
      additionalFees,
      additionalFeePayments
    }));
  }

  async function createMember(member) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };

    const { error } = await client.from('members').insert({
      zone_id: member.zone_id,
      name: member.name,
      address: member.address || null,
      phone: member.phone || null,
      is_active: member.is_active !== false
    });

    if (error) return { success: false, message: error.message || 'Unable to create member.' };
    await hydrateSupabaseCache();
    return { success: true };
  }

  async function updateMember(memberId, updates) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };

    const { error } = await client
      .from('members')
      .update({
        zone_id: updates.zone_id,
        name: updates.name,
        address: updates.address || null,
        phone: updates.phone || null
      })
      .eq('id', memberId);

    if (error) return { success: false, message: error.message || 'Unable to update member.' };
    await hydrateSupabaseCache();
    return { success: true };
  }

  async function deleteMember(memberId) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };

    const { error } = await client.from('members').delete().eq('id', memberId);
    if (error) return { success: false, message: error.message || 'Unable to delete member.' };
    await hydrateSupabaseCache();
    return { success: true };
  }

  async function createTreasurerAccount({ fullName, email, username, password, zoneId }) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };

    const { data: currentSession } = await client.auth.getSession();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username,
          role: 'zone_treasurer',
          zone_id: String(zoneId)
        }
      }
    });

    if (currentSession.session) {
      await client.auth.setSession({
        access_token: currentSession.session.access_token,
        refresh_token: currentSession.session.refresh_token
      });
    }

    if (error) return { success: false, message: error.message || 'Unable to create treasurer account.' };
    if (!data.user) return { success: false, message: 'Supabase did not return the new user.' };

    await hydrateSupabaseCache();
    return {
      success: true,
      requiresEmailConfirmation: !data.session
    };
  }

  async function createZone({ name, description }) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };

    const { error } = await client.from('zones').insert({ name, description });
    if (error) return { success: false, message: error.message || 'Unable to create zone.' };
    await hydrateSupabaseCache();
    return { success: true };
  }

  async function updateZone(zoneId, { name, description }) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };

    const { error } = await client.from('zones').update({ name, description }).eq('id', zoneId);
    if (error) return { success: false, message: error.message || 'Unable to update zone.' };
    await hydrateSupabaseCache();
    return { success: true };
  }

  async function deleteZone(zoneId) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };

    const { error } = await client.from('zones').delete().eq('id', zoneId);
    if (error) return { success: false, message: error.message || 'Unable to delete zone.' };
    await hydrateSupabaseCache();
    return { success: true };
  }

  async function saveMonthlyDueSettings(settings) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };

    const { error } = await client.from('monthly_due_settings').upsert({
      year: settings.year,
      monthly_amount: settings.monthly_amount,
      yearly_due: settings.yearly_due,
      active_threshold: settings.active_threshold
    }, { onConflict: 'year' });

    if (error) {
      if (error.code === '42501') {
        return {
          success: false,
          message: 'Monthly Due requires an admin Supabase profile. Set this account role to admin in public.profiles, then sign in again.'
        };
      }
      return { success: false, message: error.message || 'Unable to save monthly due settings.' };
    }

    const { data: members, error: membersError } = await client.from('members').select('id');
    if (membersError) return { success: false, message: membersError.message || 'Unable to load members for the monthly due.' };

    const { data: existingPayments, error: paymentsError } = await client
      .from('monthly_payments')
      .select('member_id, month, paid')
      .eq('year', settings.year);
    if (paymentsError) return { success: false, message: paymentsError.message || 'Unable to load monthly payment records.' };

    const existing = new Map((existingPayments || []).map((payment) => [`${payment.member_id}-${payment.month}`, payment]));
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = months[new Date().getMonth()];
    const paymentRows = [];
    (members || []).forEach((member) => {
      const month = currentMonth;
      const current = existing.get(`${member.id}-${month}`);
      if (!current || !current.paid) {
        paymentRows.push({
          member_id: member.id,
          year: settings.year,
          month,
          amount: settings.monthly_amount,
          paid: false
        });
      }
    });

    if (paymentRows.length) {
      const { error: paymentUpsertError } = await client
        .from('monthly_payments')
        .upsert(paymentRows, { onConflict: 'member_id,year,month' });
      if (paymentUpsertError) return { success: false, message: paymentUpsertError.message || 'Unable to create unpaid monthly due records.' };
    }

    await hydrateSupabaseCache();
    return { success: true };
  }

  async function createAdditionalFee(fee) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };

    const { error } = await client.from('additional_fees').insert({
      id: fee.id,
      name: fee.name,
      amount: fee.amount,
      year: fee.year,
      description: fee.description || null
    });

    if (error) return { success: false, message: error.message || 'Unable to create additional fee.' };

    const { data: members, error: membersError } = await client.from('members').select('id');
    if (membersError) return { success: false, message: membersError.message || 'Unable to load members for the additional fee.' };
    const paymentRows = (members || []).map((member) => ({
      fee_id: fee.id,
      member_id: member.id,
      year: fee.year,
      amount: fee.amount,
      paid: false
    }));
    if (paymentRows.length) {
      const { error: paymentError } = await client
        .from('additional_fee_payments')
        .upsert(paymentRows, { onConflict: 'fee_id,member_id,year' });
      if (paymentError) return { success: false, message: paymentError.message || 'Unable to create unpaid fee records.' };
    }

    await hydrateSupabaseCache();
    return { success: true };
  }

  async function updateAdditionalFee(feeId, fee) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };

    const { error } = await client.from('additional_fees').update({
      name: fee.name,
      amount: fee.amount,
      year: fee.year,
      description: fee.description || null
    }).eq('id', feeId);
    if (error) return { success: false, message: error.message || 'Unable to update additional fee.' };

    const { data: payments, error: paymentsError } = await client
      .from('additional_fee_payments')
      .select('member_id, paid')
      .eq('fee_id', feeId)
      .eq('year', fee.year);
    if (paymentsError) return { success: false, message: paymentsError.message || 'Unable to load fee payment records.' };
    const unpaidRows = (payments || []).filter((payment) => !payment.paid).map((payment) => ({
      fee_id: feeId,
      member_id: payment.member_id,
      year: fee.year,
      amount: fee.amount,
      paid: false
    }));
    if (unpaidRows.length) {
      const { error: paymentError } = await client
        .from('additional_fee_payments')
        .upsert(unpaidRows, { onConflict: 'fee_id,member_id,year' });
      if (paymentError) return { success: false, message: paymentError.message || 'Unable to update unpaid fee records.' };
    }

    await hydrateSupabaseCache();
    return { success: true };
  }

  async function deleteAdditionalFee(feeId) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };
    const { error } = await client.from('additional_fees').delete().eq('id', feeId);
    if (error) return { success: false, message: error.message || 'Unable to delete additional fee.' };
    await hydrateSupabaseCache();
    return { success: true };
  }

  async function deleteMonthlyDueSettings(year) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };
    const { error } = await client.from('monthly_due_settings').delete().eq('year', year);
    if (error) return { success: false, message: error.message || 'Unable to delete monthly due settings.' };
    await hydrateSupabaseCache();
    return { success: true };
  }

  async function updateTreasurerProfile(profileId, { name, username, zoneId }) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };

    const { error } = await client.from('profiles').update({
      name,
      username,
      zone_id: zoneId
    }).eq('id', profileId).eq('role', 'zone_treasurer');

    if (error) return { success: false, message: error.message || 'Unable to update treasurer.' };
    await hydrateSupabaseCache();
    return { success: true };
  }

  async function deleteTreasurerProfile(profileId) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };

    const { error } = await client.from('profiles')
      .delete()
      .eq('id', profileId)
      .eq('role', 'zone_treasurer');

    if (error) return { success: false, message: error.message || 'Unable to delete treasurer.' };
    await hydrateSupabaseCache();
    return { success: true };
  }

  async function saveMonthlyPayment(payment) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };

    const user = getCurrentUser();
    const { error } = await client.from('monthly_payments').upsert({
      member_id: payment.member_id,
      year: payment.year,
      month: payment.month,
      amount: payment.amount,
      paid: payment.paid,
      paid_date: payment.paid ? new Date().toISOString() : null,
      recorded_by: user?.id || null
    }, { onConflict: 'member_id,year,month' });

    if (error) return { success: false, message: error.message || 'Unable to save monthly payment.' };
    await hydrateSupabaseCache();
    return { success: true };
  }

  async function saveAdditionalFeePayment(payment) {
    const client = await ensureSupabaseClient();
    if (!client) return { success: false, message: 'Supabase is not configured.' };

    const user = getCurrentUser();
    const { error } = await client.from('additional_fee_payments').upsert({
      fee_id: payment.fee_id,
      member_id: payment.member_id,
      year: payment.year,
      amount: payment.amount,
      paid: payment.paid,
      paid_date: payment.paid ? new Date().toISOString() : null,
      recorded_by: user?.id || null
    }, { onConflict: 'fee_id,member_id,year' });

    if (error) return { success: false, message: error.message || 'Unable to save additional fee payment.' };
    await hydrateSupabaseCache();
    return { success: true };
  }

  async function ready() {
    try {
      if (isSupabaseConfigured()) {
        await hydrateSupabaseCache();
      }
    } catch (error) {
      console.error('Supabase data hydration failed.', error);
    }
  }

  window.TRMSAuth = {
    getMockData,
    saveMockData,
    resetMockData,
    login,
    logout,
    getCurrentUser,
    createMember,
    updateMember,
    deleteMember,
    createTreasurerAccount,
    createZone,
    updateZone,
    deleteZone,
    saveMonthlyDueSettings,
    createAdditionalFee,
    updateAdditionalFee,
    deleteAdditionalFee,
    deleteMonthlyDueSettings,
    updateTreasurerProfile,
    deleteTreasurerProfile,
    saveMonthlyPayment,
    saveAdditionalFeePayment,
    hydrateSupabaseCache,
    ready
  };

  window.alert = showAlert;
})();
