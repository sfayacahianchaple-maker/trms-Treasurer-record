(function () {
const XLSX = window.XLSX;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CURRENCY_FORMAT = '"₱"#,##0.00;[Red]-"₱"#,##0.00';
const DATE_FORMAT = 'yyyy-mm-dd hh:mm';
let backupReady = false;

const element = (id) => document.getElementById(id);
const number = (value) => Number(value || 0);
const amountTotal = (rows, predicate = () => true) => rows
  .filter(predicate)
  .reduce((total, row) => total + number(row.amount), 0);

function memberName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2 || String(name).includes(',')) return String(name || '');
  return `${parts.pop()}, ${parts.join(' ')}`;
}

function toExcelDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date;
}

function zoneName(zoneId, zonesById) {
  return zonesById.get(String(zoneId))?.name || '';
}

function memberZoneName(member, zonesById) {
  return zoneName(member.zone_id, zonesById);
}

function makeSheet(headers, rows, { widths = [], moneyColumns = [], dateColumns = [] } = {}) {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet['!cols'] = headers.map((_, index) => ({ wch: widths[index] || 18 }));

  rows.forEach((row, rowIndex) => {
    moneyColumns.forEach((columnIndex) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex })];
      if (cell && typeof cell.v === 'number') cell.z = CURRENCY_FORMAT;
    });
    dateColumns.forEach((columnIndex) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex })];
      if (cell && cell.v instanceof Date) cell.z = DATE_FORMAT;
    });
  });
  return sheet;
}

function addSheet(workbook, name, headers, rows, options) {
  XLSX.utils.book_append_sheet(workbook, makeSheet(headers, rows, options), name);
}

function createWorkbook() {
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: 'TRMS Backup',
    Subject: 'TRMS member and financial records',
    Author: 'TRMS'
  };
  return workbook;
}

function annualData(data, year) {
  const zonesById = new Map(data.zones.map((zone) => [String(zone.id), zone]));
  const membersById = new Map(data.members.map((member) => [String(member.id), member]));
  const eligibleMembers = data.members.filter((member) => number(member.start_year) <= year);
  const dueSettings = data.monthlyDueSettings.find((setting) => number(setting.year) === year) || {};
  const monthlyAmount = number(dueSettings.monthly_amount);
  const yearlyDue = number(dueSettings.yearly_due) || monthlyAmount * 12;
  const monthlyRecords = data.monthlyPayments.filter((payment) => number(payment.year) === year);
  const eligibleMemberIds = new Set(eligibleMembers.map((member) => String(member.id)));
  const monthlyMemberIds = new Set(monthlyRecords.map((payment) => String(payment.member_id)));
  const monthlyMembers = data.members.filter((member) =>
    eligibleMemberIds.has(String(member.id)) || monthlyMemberIds.has(String(member.id))
  );
  const monthlyByMember = new Map();
  monthlyRecords.forEach((payment) => {
    const key = String(payment.member_id);
    if (!monthlyByMember.has(key)) monthlyByMember.set(key, new Map());
    monthlyByMember.get(key).set(payment.month, payment);
  });

  const monthlyRows = monthlyMembers.map((member) => {
    const payments = monthlyByMember.get(String(member.id)) || new Map();
    const paid = MONTHS.filter((month) => payments.get(month)?.paid)
      .reduce((sum, month) => sum + number(payments.get(month).amount), 0);
    return [
      member.id,
      memberName(member.name),
      memberZoneName(member, zonesById),
      year,
      ...MONTHS.map((month) => payments.get(month)?.paid ? 'Paid' : 'Unpaid'),
      monthlyAmount,
      paid,
      eligibleMemberIds.has(String(member.id)) ? Math.max(yearlyDue - paid, 0) : 0
    ];
  });

  const feesById = new Map(data.additionalFees.map((fee) => [String(fee.id), fee]));
  const feePayments = data.additionalFeePayments.filter((payment) => number(payment.year) === year);
  const feePaymentByKey = new Map(feePayments.map((payment) => [
    `${payment.fee_id}:${payment.member_id}`,
    payment
  ]));
  const annualFees = data.additionalFees.filter((fee) => number(fee.year) === year);
  const additionalRows = [];
  const exportedFeePaymentKeys = new Set();
  annualFees.forEach((fee) => {
    eligibleMembers.forEach((member) => {
      const payment = feePaymentByKey.get(`${fee.id}:${member.id}`);
      exportedFeePaymentKeys.add(`${fee.id}:${member.id}`);
      const feeAmount = payment && payment.paid
        ? number(payment.amount)
        : number(payment?.amount) || number(fee.amount);
      additionalRows.push([
        member.id,
        memberName(member.name),
        memberZoneName(member, zonesById),
        year,
        fee.name,
        feeAmount,
        payment?.paid ? 'Paid' : 'Unpaid',
        toExcelDate(payment?.paid_date)
      ]);
    });
  });
  feePayments.forEach((payment) => {
    if (exportedFeePaymentKeys.has(`${payment.fee_id}:${payment.member_id}`)) return;
    const member = membersById.get(String(payment.member_id));
    const fee = feesById.get(String(payment.fee_id));
    additionalRows.push([
      payment.member_id,
      memberName(member?.name || ''),
      member ? memberZoneName(member, zonesById) : '',
      year,
      fee?.name || 'Unknown fee',
      number(payment.amount),
      payment.paid ? 'Paid' : 'Unpaid',
      toExcelDate(payment.paid_date)
    ]);
  });

  const summaryRows = data.zones.map((zone) => {
    const zoneMembers = eligibleMembers.filter((member) => String(member.zone_id) === String(zone.id));
    const zoneMemberIds = new Set(zoneMembers.map((member) => String(member.id)));
    const paidMonthly = amountTotal(monthlyRecords, (payment) =>
      payment.paid && zoneMemberIds.has(String(payment.member_id))
    );
    const paidAdditional = amountTotal(feePayments, (payment) =>
      payment.paid && zoneMemberIds.has(String(payment.member_id))
    );
    const outstandingMonthly = Math.max(zoneMembers.length * yearlyDue - paidMonthly, 0);
    const outstandingFees = additionalRows
      .filter((row) => row[2] === zone.name && row[6] === 'Unpaid')
      .reduce((sum, row) => sum + number(row[5]), 0);
    return [
      zone.name,
      zoneMembers.length,
      paidMonthly,
      paidAdditional,
      paidMonthly + paidAdditional,
      outstandingMonthly + outstandingFees
    ];
  });

  return {
    eligibleMembers,
    monthlyRecords,
    feePayments,
    monthlyRows,
    additionalRows,
    summaryRows
  };
}

function annualWorkbook(data, year) {
  const annual = annualData(data, year);
  if (annual.monthlyRecords.length === 0 && annual.feePayments.length === 0) {
    throw new Error('NO_RECORDS');
  }

  const workbook = createWorkbook();
  const zonesById = new Map(data.zones.map((zone) => [String(zone.id), zone]));
  addSheet(workbook, 'Members', [
    'Member ID', 'Full Name (Last Name First)', 'Zone', 'Address', 'Contact Number', 'Start Year'
  ], data.members.map((member) => [
    member.id,
    memberName(member.name),
    memberZoneName(member, zonesById),
    member.address || '',
    member.phone || '',
    member.start_year
  ]), { widths: [14, 30, 22, 32, 20, 14] });

  addSheet(workbook, 'Monthly Payments', [
    'Member ID', 'Member Name', 'Zone', 'Year', ...MONTH_LABELS.map((month) => `${month} Status`),
    'Monthly Amount', 'Total Paid', 'Total Unpaid'
  ], annual.monthlyRows, {
    widths: [14, 28, 20, 10, ...MONTHS.map(() => 14), 18, 18, 18],
    moneyColumns: [16, 17, 18]
  });

  addSheet(workbook, 'Additional Fees', [
    'Member ID', 'Member Name', 'Zone', 'Year', 'Fee Name', 'Fee Amount', 'Payment Status', 'Date Paid'
  ], annual.additionalRows, {
    widths: [14, 28, 20, 10, 28, 18, 18, 22],
    moneyColumns: [5],
    dateColumns: [7]
  });

  addSheet(workbook, 'Annual Summary', [
    'Zone', 'Total Members', 'Total Monthly Dues Paid', 'Total Additional Fees Paid',
    'Total Collected', 'Total Outstanding Balance'
  ], annual.summaryRows, {
    widths: [24, 16, 24, 28, 20, 28],
    moneyColumns: [2, 3, 4, 5]
  });
  return { workbook, recordCount: workbook.SheetNames.reduce((count, name) =>
    count + Math.max(XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 }).length - 1, 0), 0) };
}

function completeFinancialSummary(data) {
  const zonesById = new Map(data.zones.map((zone) => [String(zone.id), zone]));
  const years = new Set([
    ...data.monthlyDueSettings.map((row) => number(row.year)),
    ...data.monthlyPayments.map((row) => number(row.year)),
    ...data.additionalFees.map((row) => number(row.year)),
    ...data.additionalFeePayments.map((row) => number(row.year)),
    ...data.weddingFees.map((row) => number(row.year))
  ]);
  const rows = [];
  [...years].filter(Boolean).sort((a, b) => a - b).forEach((year) => {
    const setting = data.monthlyDueSettings.find((row) => number(row.year) === year) || {};
    const monthlyDue = number(setting.yearly_due) || number(setting.monthly_amount) * 12;
    data.zones.forEach((zone) => {
      const members = data.members.filter((member) =>
        String(member.zone_id) === String(zone.id) && number(member.start_year) <= year
      );
      const memberIds = new Set(members.map((member) => String(member.id)));
      const payments = data.monthlyPayments.filter((payment) =>
        number(payment.year) === year && memberIds.has(String(payment.member_id))
      );
      const feePayments = data.additionalFeePayments.filter((payment) =>
        number(payment.year) === year && memberIds.has(String(payment.member_id))
      );
      const fees = data.additionalFees.filter((fee) => number(fee.year) === year);
      const feePaymentsByMemberAndFee = new Map(feePayments.map((payment) => [
        `${payment.fee_id}:${payment.member_id}`,
        payment
      ]));
      const weddingPayments = data.weddingFees.filter((payment) =>
        number(payment.year) === year && memberIds.has(String(payment.member_id))
      );
      const monthlyPaid = amountTotal(payments, (payment) => payment.paid);
      const additionalPaid = amountTotal(feePayments, (payment) => payment.paid);
      const weddingPaid = amountTotal(weddingPayments, (payment) => payment.paid);
      const unpaidAdditional = fees.reduce((total, fee) => total + members.reduce((sum, member) => {
        const payment = feePaymentsByMemberAndFee.get(`${fee.id}:${member.id}`);
        if (payment?.paid) return sum;
        return sum + (number(payment?.amount) || number(fee.amount));
      }, 0), 0);
      const unpaidWedding = amountTotal(weddingPayments, (payment) => !payment.paid);
      const outstanding = Math.max(members.length * monthlyDue - monthlyPaid, 0) + unpaidAdditional + unpaidWedding;
      rows.push([
        zoneName(zone.id, zonesById),
        year,
        members.length,
        monthlyPaid,
        additionalPaid,
        weddingPaid,
        monthlyPaid + additionalPaid + weddingPaid,
        outstanding
      ]);
    });
  });
  return rows;
}

function completeWorkbook(data) {
  const workbook = createWorkbook();
  const zonesById = new Map(data.zones.map((zone) => [String(zone.id), zone]));
  const membersById = new Map(data.members.map((member) => [String(member.id), member]));
  const feesById = new Map(data.additionalFees.map((fee) => [String(fee.id), fee]));
  addSheet(workbook, 'Zones', ['ID', 'Name', 'Description', 'Treasurer ID', 'Created At'],
    data.zones.map((row) => [row.id, row.name, row.description || '', row.treasurer_id || '', toExcelDate(row.created_at)]),
    { widths: [14, 26, 40, 38, 22], dateColumns: [4] });

  addSheet(workbook, 'Members', [
    'ID', 'Zone ID', 'Name', 'Address', 'Contact Number', 'Start Year', 'Active', 'Archived At', 'Created At'
  ], data.members.map((row) => [
    row.id, row.zone_id, row.name, row.address || '', row.phone || '', row.start_year,
    row.is_active, toExcelDate(row.archived_at), toExcelDate(row.created_at)
  ]), { widths: [14, 14, 30, 34, 20, 14, 12, 22, 22], dateColumns: [7, 8] });

  addSheet(workbook, 'Treasurer Assignments', [
    'Profile ID', 'Username', 'Name', 'Role', 'Zone ID', 'Zone', 'Created At'
  ], data.treasurers.map((row) => [
    row.id, row.username || '', row.name, row.role, row.zone_id || '',
    zoneName(row.zone_id, zonesById), toExcelDate(row.created_at)
  ]), { widths: [38, 22, 28, 20, 14, 22, 22], dateColumns: [6] });

  addSheet(workbook, 'Monthly Due Settings', [
    'ID', 'Year', 'Monthly Amount', 'Yearly Due', 'Active Threshold', 'Created At'
  ], data.monthlyDueSettings.map((row) => [
    row.id, row.year, number(row.monthly_amount), number(row.yearly_due),
    number(row.active_threshold), toExcelDate(row.created_at)
  ]), { widths: [14, 12, 20, 18, 20, 22], moneyColumns: [2, 3, 4], dateColumns: [5] });

  addSheet(workbook, 'Monthly Payment Records', [
    'ID', 'Member ID', 'Member Name', 'Zone', 'Year', 'Month', 'Amount', 'Paid', 'Paid Date', 'Recorded By', 'Created At'
  ], data.monthlyPayments.map((row) => {
    const member = membersById.get(String(row.member_id));
    return [
      row.id, row.member_id, member?.name || '', member ? memberZoneName(member, zonesById) : '',
      row.year, row.month, number(row.amount), row.paid ? 'Paid' : 'Unpaid',
      toExcelDate(row.paid_date), row.recorded_by || '', toExcelDate(row.created_at)
    ];
  }), { widths: [14, 14, 30, 22, 12, 12, 18, 14, 22, 38, 22], moneyColumns: [6], dateColumns: [8, 10] });

  addSheet(workbook, 'Additional Fee Settings', [
    'ID', 'Name', 'Description', 'Amount', 'Year', 'Created At'
  ], data.additionalFees.map((row) => [
    row.id, row.name, row.description || '', number(row.amount), row.year, toExcelDate(row.created_at)
  ]), { widths: [24, 28, 40, 18, 12, 22], moneyColumns: [3], dateColumns: [5] });

  addSheet(workbook, 'Additional Fee Payment Records', [
    'ID', 'Fee ID', 'Fee Name', 'Member ID', 'Member Name', 'Zone', 'Year', 'Amount', 'Paid', 'Paid Date', 'Recorded By', 'Created At'
  ], data.additionalFeePayments.map((row) => {
    const member = membersById.get(String(row.member_id));
    return [
      row.id, row.fee_id, feesById.get(String(row.fee_id))?.name || '',
      row.member_id, member?.name || '', member ? memberZoneName(member, zonesById) : '',
      row.year, number(row.amount), row.paid ? 'Paid' : 'Unpaid', toExcelDate(row.paid_date),
      row.recorded_by || '', toExcelDate(row.created_at)
    ];
  }), { widths: [14, 24, 28, 14, 30, 22, 12, 18, 14, 22, 38, 22], moneyColumns: [7], dateColumns: [9, 11] });

  addSheet(workbook, 'Financial Summary', [
    'Zone', 'Year', 'Total Members', 'Total Monthly Dues Paid', 'Total Additional Fees Paid',
    'Wedding Fees Paid', 'Total Collected', 'Total Outstanding Balance'
  ], completeFinancialSummary(data), {
    widths: [24, 12, 16, 26, 28, 20, 20, 28],
    moneyColumns: [3, 4, 5, 6, 7]
  });

  addSheet(workbook, 'Wedding Fee Records', [
    'ID', 'Member ID', 'Member Name', 'Zone', 'Year', 'Amount', 'Paid', 'Paid Date', 'Recorded By', 'Created At'
  ], data.weddingFees.map((row) => {
    const member = membersById.get(String(row.member_id));
    return [
      row.id, row.member_id, member?.name || '', member ? memberZoneName(member, zonesById) : '',
      row.year, number(row.amount), row.paid ? 'Paid' : 'Unpaid', toExcelDate(row.paid_date),
      row.recorded_by || '', toExcelDate(row.created_at)
    ];
  }), { widths: [14, 14, 30, 22, 12, 18, 14, 22, 38, 22], moneyColumns: [5], dateColumns: [7, 9] });

  const recordCount = workbook.SheetNames.reduce((count, name) =>
    count + Math.max(XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 }).length - 1, 0), 0);
  return { workbook, recordCount };
}

async function saveWorkbook(workbook, filename) {
  if (!XLSX) {
    throw new Error('The Excel export library did not load. Check your internet connection and reload the page.');
  }
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true });
  const blob = new Blob([output], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  if (window.Capacitor?.isNativePlatform()) {
    const filesystem = window.Capacitor.registerPlugin('Filesystem');
    const share = window.Capacitor.registerPlugin('Share');
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Unable to prepare the backup file.'));
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(blob);
    });
    const { uri } = await filesystem.writeFile({
      path: filename,
      data: base64,
      directory: 'CACHE'
    });
    await share.share({
      title: filename,
      dialogTitle: 'Save TRMS backup',
      files: [uri]
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const download = document.createElement('a');
  download.href = url;
  download.download = filename;
  download.style.display = 'none';
  document.body.appendChild(download);
  download.click();
  download.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function setBusy(busy) {
  const annualButton = element('downloadAnnual');
  const completeButton = element('downloadComplete');
  annualButton.disabled = busy || !backupReady;
  completeButton.disabled = busy || !backupReady;
  element('backupYear').disabled = busy || !backupReady;
  annualButton.textContent = busy ? 'Generating backup…' : 'Download Annual Backup';
  completeButton.textContent = busy ? 'Generating backup…' : 'Download Complete Backup';
  annualButton.setAttribute('aria-busy', String(busy));
  completeButton.setAttribute('aria-busy', String(busy));
}

function updateBackupInfo(type, year, recordCount) {
  element('generatedAt').textContent = new Date().toLocaleString('en-PH');
  element('exportType').textContent = type;
  element('exportYear').textContent = year;
  element('exportRecordCount').textContent = recordCount.toLocaleString('en-PH');
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function exportBackup(type) {
  if (type === 'complete' && !window.confirm(
    'Download a complete backup of all zones and years? The workbook contains personal and financial information.'
  )) return;

  const status = element('backupMessage');
  status.className = 'backup-message is-loading';
  status.textContent = 'Generating your backup. Please wait…';
  setBusy(true);

  try {
    const data = await window.TRMSAuth.getAdminBackupData(type);
    const year = Number(element('backupYear').value);
    const result = type === 'annual' ? annualWorkbook(data, year) : completeWorkbook(data);
    const generatedOn = new Date();
    const dateSuffix = localDateString(generatedOn);
    const filename = type === 'annual'
      ? `TRMS_Annual_Backup_${year}_${year}-12-31.xlsx`
      : `TRMS_Complete_Backup_${dateSuffix}.xlsx`;
    await saveWorkbook(result.workbook, filename);
    updateBackupInfo(type === 'annual' ? 'Annual Backup' : 'Complete Backup', type === 'annual' ? year : 'All years', result.recordCount);
    status.className = 'backup-message is-success';
    status.textContent = 'Backup completed successfully! Your Excel file has been downloaded.';
  } catch (error) {
    console.error('TRMS backup generation failed.', error);
    status.className = 'backup-message is-error';
    status.textContent = error.message === 'NO_RECORDS'
      ? 'No payment records were found for the selected year.'
      : `Backup failed. Please try again. ${error.message || 'Unable to read data from Supabase.'}`;
  } finally {
    setBusy(false);
  }
}

function populateYears(years) {
  const select = element('backupYear');
  select.replaceChildren(...years.sort((a, b) => a - b).map((year) => {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = String(year);
    return option;
  }));
  const currentYear = new Date().getFullYear();
  if (years.includes(currentYear)) select.value = String(currentYear);
}

document.addEventListener('DOMContentLoaded', async () => {
  const status = element('backupMessage');
  status.className = 'backup-message is-loading';
  status.textContent = 'Connecting to Supabase and loading backup totals…';
  try {
    const counts = await window.TRMSAuth.getAdminBackupSummary();
    element('totalMembers').textContent = counts.members.toLocaleString('en-PH');
    element('totalZones').textContent = counts.zones.toLocaleString('en-PH');
    element('totalMonthlyPayments').textContent = counts.monthlyPayments.toLocaleString('en-PH');
    element('totalAdditionalPayments').textContent = counts.additionalFeePayments.toLocaleString('en-PH');
    const lastYear = Math.max(new Date().getFullYear(), 2027);
    populateYears(Array.from({ length: lastYear - 2024 + 1 }, (_, index) => 2024 + index));
    backupReady = true;
    status.className = 'backup-message';
    status.textContent = '';
    setBusy(false);
  } catch (error) {
    console.error('Unable to load TRMS backup data.', error);
    status.className = 'backup-message is-error';
    status.textContent = `Unable to load backup totals from Supabase. ${error.message || 'Check your connection and administrator access, then try again.'}`;
  }

  element('downloadAnnual').addEventListener('click', () => exportBackup('annual'));
  element('downloadComplete').addEventListener('click', () => exportBackup('complete'));
});
})();
