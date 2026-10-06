/**
 * AARIDE HIGH-SAAS OPERATING SYSTEM - CLIENT ENGINE
 * Handles Live Telemetry, Vault Compliance, Ledger Calculations, and Auth
 */

const state = {
  drivers: [],
  selectedDriverId: null,
  selectedDriver: null,
};

const API_BASE = '/api';

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  checkApiHealth();
  loadAdminFleetData();

  const todayStr = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('ledgerEntryDate');
  if (dateInput) {
    dateInput.value = todayStr;
  }
});

// =============================================================================
// API TELEMETRY
// =============================================================================
async function checkApiHealth() {
  const pill = document.getElementById('telemetryPill');
  const text = document.getElementById('telemetryText');

  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    if (res.ok && data.status === 'ONLINE') {
      text.textContent = 'Live Telemetry';
      pill.style.background = '#ECFDF5';
      pill.style.borderColor = '#A7F3D0';
      pill.style.color = '#047857';
    } else {
      text.textContent = 'Degraded';
      pill.style.background = '#FFFBEB';
      pill.style.borderColor = '#FDE68A';
      pill.style.color = '#B45309';
    }
  } catch (err) {
    text.textContent = 'Telemetry Offline';
    pill.style.background = '#FEF2F2';
    pill.style.borderColor = '#FECACA';
    pill.style.color = '#B91C1C';
  }
}

// =============================================================================
// WINDOW VIEW SWITCHER (ADMIN vs DRIVER)
// =============================================================================
function switchWindowView(view) {
  const adminWrapper = document.getElementById('adminViewWrapper');
  const driverWrapper = document.getElementById('driverViewWrapper');
  const btnTabAdmin = document.getElementById('btnTabAdmin');
  const btnTabDriver = document.getElementById('btnTabDriver');
  const navLinkAdmin = document.getElementById('navLinkAdmin');
  const navLinkDriver = document.getElementById('navLinkDriver');

  if (view === 'admin') {
    adminWrapper.style.display = 'block';
    driverWrapper.classList.remove('active');

    btnTabAdmin.classList.add('active');
    btnTabDriver.classList.remove('active');

    if (navLinkAdmin) navLinkAdmin.classList.add('active');
    if (navLinkDriver) navLinkDriver.classList.remove('active');
  } else {
    adminWrapper.style.display = 'none';
    driverWrapper.classList.add('active');

    btnTabAdmin.classList.remove('active');
    btnTabDriver.classList.add('active');

    if (navLinkAdmin) navLinkAdmin.classList.remove('active');
    if (navLinkDriver) navLinkDriver.classList.add('active');

    if (!state.selectedDriverId && state.drivers.length > 0) {
      onDriverSelected(state.drivers[0].id);
    }
  }

  // Smooth scroll to command center
  const commandCenter = document.getElementById('commandCenter');
  if (commandCenter) {
    const yOffset = -80;
    const y = commandCenter.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}

function switchDriverSubTab(tab) {
  const tabs = ['vault', 'ledger', 'family'];
  tabs.forEach((t) => {
    const el = document.getElementById(`driverSubtab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const btn = document.getElementById(`subtabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (el) el.style.display = t === tab ? 'block' : 'none';
    if (btn) {
      if (t === tab) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
}

// =============================================================================
// ADMIN FLEET & METRICS
// =============================================================================
async function loadAdminFleetData() {
  const tbody = document.getElementById('adminDriversTableBody');

  try {
    const res = await fetch(`${API_BASE}/admin/drivers`);
    const result = await res.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch fleet data');
    }

    state.drivers = result.data;
    renderFleetMetrics(state.drivers);
    renderDriverDropdowns(state.drivers);
    renderFleetTable(state.drivers);

    const notice = document.getElementById('tableUpdatedNotice');
    if (notice) notice.textContent = `Updated just now (${state.drivers.length} registered)`;
  } catch (err) {
    console.error('Fleet query error:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem; color: #DC2626;">
          <i class="fa-solid fa-circle-exclamation"></i> Error loading fleet telemetry: ${err.message}.<br>
          <small style="color: #64748B;">Please ensure PostgreSQL tables from schema.sql are initialized.</small>
        </td>
      </tr>
    `;
  }
}

function renderFleetMetrics(drivers) {
  const total = drivers.length;
  let totalDocs = 0;
  let alertDocs = 0;
  const now = new Date();

  drivers.forEach((d) => {
    const docs = d.driver_documents || [];
    totalDocs += docs.length;
    docs.forEach((doc) => {
      if (doc.expiry_date) {
        const diff = new Date(doc.expiry_date) - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days <= 30) alertDocs++;
      }
    });
  });

  const kpiDrivers = document.getElementById('saasKpiDrivers');
  const kpiVaultDocs = document.getElementById('saasKpiVaultDocs');
  const kpiAlertDocs = document.getElementById('saasKpiAlertDocs');
  const kpiCollections = document.getElementById('saasKpiCollections');

  if (kpiDrivers) kpiDrivers.textContent = total;
  if (kpiVaultDocs) kpiVaultDocs.textContent = totalDocs.toLocaleString('en-IN');
  if (kpiAlertDocs) kpiAlertDocs.textContent = alertDocs;
  if (kpiCollections) {
    // Dynamic or simulated calculation based on registered fleet
    const estimatedLedger = total > 0 ? `₹${(total * 4200).toLocaleString('en-IN')}` : '₹0';
    kpiCollections.textContent = estimatedLedger;
  }
}

function renderDriverDropdowns(drivers) {
  const portalSelect = document.getElementById('driverSelectDropdown');
  const docTargetSelect = document.getElementById('docTargetDriver');
  const familyTargetSelect = document.getElementById('familyTargetDriver');

  const options = drivers.map(
    (d) => `<option value="${d.id}">${d.full_name} (${d.vehicle_number})</option>`
  ).join('');

  if (portalSelect) {
    portalSelect.innerHTML = `<option value="">-- Choose Driver --</option>` + options;
    if (state.selectedDriverId) portalSelect.value = state.selectedDriverId;
  }
  if (docTargetSelect) {
    docTargetSelect.innerHTML = `<option value="">-- Choose Driver --</option>` + options;
  }
  if (familyTargetSelect) {
    familyTargetSelect.innerHTML = `<option value="">-- Choose Driver --</option>` + options;
  }
}

function renderFleetTable(drivers) {
  const tbody = document.getElementById('adminDriversTableBody');

  if (!drivers || drivers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem; color: #64748B;">
          No vehicles allocated yet. Click <strong>"Deploy Free Workspace"</strong> or <strong>"+ Add Driver"</strong> to onboard your first vehicle.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = drivers.map((d) => {
    const docsCount = d.driver_documents ? d.driver_documents.length : 0;
    const statusPill = d.is_active
      ? `<span class="status-pill-saas allocated"><i class="fa-solid fa-circle-check"></i> Allocated</span>`
      : `<span class="status-pill-saas pending"><i class="fa-solid fa-clock"></i> Suspended</span>`;

    return `
      <tr>
        <td>
          <div class="driver-cell-name">${escapeHtml(d.full_name)}</div>
          <div class="driver-cell-sub">${docsCount} compliance doc${docsCount === 1 ? '' : 's'}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(d.phone)}</div>
          <div class="driver-cell-sub">${escapeHtml(d.email || 'No email')}</div>
        </td>
        <td>
          <span class="plate-badge">${escapeHtml(d.vehicle_number)}</span>
        </td>
        <td>${escapeHtml(d.vehicle_model)}</td>
        <td><code style="color: #0F766E; font-weight: 700;">${escapeHtml(d.license_number)}</code></td>
        <td>${statusPill}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn-saas btn-saas-secondary btn-sm" onclick="viewDriverWorkspace('${d.id}')">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> Open
            </button>
            <button class="btn-saas btn-saas-secondary btn-sm" title="Upload Document" onclick="openUploadDocForSpecificDriver('${d.id}')">
              <i class="fa-solid fa-cloud-arrow-up"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterDriversTable() {
  const query = document.getElementById('adminSearchInput').value.toLowerCase().trim();
  const filtered = state.drivers.filter((d) => {
    return (
      d.full_name.toLowerCase().includes(query) ||
      d.phone.toLowerCase().includes(query) ||
      d.vehicle_number.toLowerCase().includes(query) ||
      d.license_number.toLowerCase().includes(query) ||
      d.vehicle_model.toLowerCase().includes(query)
    );
  });
  renderFleetTable(filtered);
}

// =============================================================================
// DRIVER PORTAL LOGIC
// =============================================================================
function viewDriverWorkspace(driverId) {
  switchWindowView('driver');
  onDriverSelected(driverId);
}

async function onDriverSelected(driverId) {
  if (!driverId) return;

  state.selectedDriverId = driverId;
  const driverSelect = document.getElementById('driverSelectDropdown');
  if (driverSelect) driverSelect.value = driverId;

  state.selectedDriver = state.drivers.find((d) => d.id === driverId) || null;

  if (state.selectedDriver) {
    document.getElementById('driverProfileName').textContent = state.selectedDriver.full_name;
    document.getElementById('driverProfileVehicle').textContent = state.selectedDriver.vehicle_number;
    document.getElementById('driverProfileModel').textContent = state.selectedDriver.vehicle_model;
    document.getElementById('driverProfileLicense').textContent = state.selectedDriver.license_number;
    document.getElementById('driverProfilePhone').textContent = state.selectedDriver.phone;

    const statusPill = document.getElementById('driverProfileStatus');
    if (state.selectedDriver.is_active) {
      statusPill.className = 'status-pill-saas allocated';
      statusPill.textContent = 'ALLOCATED';
    } else {
      statusPill.className = 'status-pill-saas pending';
      statusPill.textContent = 'SUSPENDED';
    }
  }

  await Promise.all([
    loadDriverVaultCards(driverId),
    loadDriverLedgerData(driverId),
    loadDriverFamilyData(driverId),
  ]);
}

async function loadDriverVaultCards(driverId) {
  const grid = document.getElementById('driverVaultCardsGrid');

  try {
    const res = await fetch(`${API_BASE}/driver/vault/${driverId}`);
    const result = await res.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch vault');
    }

    const docs = result.data.documents || [];

    if (docs.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: #FAFBFD; border: 1px dashed var(--border-light); border-radius: var(--radius-md);">
          <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: #94A3B8; margin-bottom: 0.75rem;"></i>
          <h4 style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem;">No documents uploaded</h4>
          <p style="font-size: 0.88rem; color: #64748B;">Upload RC Book, Driving License, or Insurance to start expiry telemetry.</p>
          <button class="btn-saas btn-saas-secondary btn-sm" style="margin-top: 1rem;" onclick="openUploadDocForCurrentDriver()">
            <i class="fa-solid fa-cloud-arrow-up"></i> Upload Document
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = docs.map((doc) => {
      let icon = 'fa-file-lines';
      if (doc.doc_type.includes('License')) icon = 'fa-id-card';
      else if (doc.doc_type.includes('RC')) icon = 'fa-car';
      else if (doc.doc_type.includes('Insurance')) icon = 'fa-shield-halved';
      else if (doc.doc_type.includes('Fitness')) icon = 'fa-wrench';

      let statusBadge = `<span class="status-pill-saas valid">VALID</span>`;
      if (doc.status === 'EXPIRING_SOON') {
        statusBadge = `<span class="status-pill-saas expiring"><i class="fa-solid fa-clock"></i> Expiring in ${doc.days_remaining}d</span>`;
      } else if (doc.status === 'EXPIRED') {
        statusBadge = `<span class="status-pill-saas expired"><i class="fa-solid fa-triangle-exclamation"></i> EXPIRED (${Math.abs(doc.days_remaining)}d ago)</span>`;
      }

      return `
        <div class="vault-item-card">
          <div>
            <div class="vault-item-top">
              <div class="vault-icon-box">
                <i class="fa-solid ${icon}"></i>
              </div>
              ${statusBadge}
            </div>
            <h4 class="vault-item-title">${escapeHtml(doc.doc_type)}</h4>
            <div class="vault-item-docnum">Doc No: ${escapeHtml(doc.doc_number || 'N/A')}</div>

            <div class="vault-dates-box">
              <div class="vault-date-line">
                <span>Issue Date:</span>
                <strong>${doc.issue_date || 'Not recorded'}</strong>
              </div>
              <div class="vault-date-line">
                <span>Expiry Date:</span>
                <strong style="color: ${doc.status === 'EXPIRED' ? '#DC2626' : doc.status === 'EXPIRING_SOON' ? '#D97706' : '#0F172A'};">
                  ${doc.expiry_date || 'No Expiry'}
                </strong>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
            <a href="${escapeHtml(doc.file_url)}" target="_blank" rel="noopener noreferrer" class="btn-saas btn-saas-secondary btn-sm">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> View Document
            </a>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; color: #DC2626; padding: 2rem;">${err.message}</div>`;
  }
}

// =============================================================================
// FINANCIAL LEDGER DATA
// =============================================================================
async function loadDriverLedgerData(driverId = state.selectedDriverId) {
  if (!driverId) return;

  const tbody = document.getElementById('driverLedgerTableBody');

  try {
    const res = await fetch(`${API_BASE}/driver/ledger/${driverId}`);
    const result = await res.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to load ledger');
    }

    const { summary, records } = result.data;

    document.getElementById('ledgerIncomeVal').textContent = `₹${(summary.total_income || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('ledgerExpenseVal').textContent = `₹${(summary.total_expense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    
    const profitEl = document.getElementById('ledgerProfitVal');
    profitEl.textContent = `₹${(summary.net_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    profitEl.style.color = summary.net_profit >= 0 ? '#059669' : '#DC2626';

    document.getElementById('ledgerDaysVal').textContent = summary.total_days_logged || 0;

    if (!records || records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2.5rem; color: #64748B;">
            No daily shift entries logged yet. Click <strong>"Record Daily Shift"</strong> to post fares and fuel expenses.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = records.map((entry) => {
      const net = Number(entry.net_profit || 0);
      const netColor = net >= 0 ? '#059669' : '#DC2626';
      return `
        <tr>
          <td><strong>${entry.entry_date}</strong></td>
          <td style="color: #059669; font-weight: 700;">₹${Number(entry.income).toFixed(2)}</td>
          <td style="color: #DC2626; font-weight: 600;">₹${Number(entry.expense).toFixed(2)}</td>
          <td style="color: ${netColor}; font-weight: 800;">₹${net.toFixed(2)}</td>
          <td>${escapeHtml(entry.notes || '-')}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color: #DC2626; text-align: center; padding: 1.5rem;">${err.message}</td></tr>`;
  }
}

function openAddLedgerModal() {
  if (!state.selectedDriverId) {
    showToast('Please select a driver workspace first.', 'error');
    return;
  }
  document.getElementById('ledgerEntryDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('ledgerIncome').value = '';
  document.getElementById('ledgerExpense').value = '';
  document.getElementById('ledgerNotes').value = '';
  document.getElementById('modalProfitPreview').textContent = '₹0.00';
  openModal('addLedgerModal');
}

function calculateModalProfitPreview() {
  const inc = Number(document.getElementById('ledgerIncome').value) || 0;
  const exp = Number(document.getElementById('ledgerExpense').value) || 0;
  const profit = inc - exp;
  const el = document.getElementById('modalProfitPreview');
  el.textContent = `₹${profit.toFixed(2)}`;
  el.style.color = profit >= 0 ? '#166534' : '#DC2626';
}

async function handleAddLedger(event) {
  event.preventDefault();

  const payload = {
    driver_id: state.selectedDriverId,
    entry_date: document.getElementById('ledgerEntryDate').value,
    income: Number(document.getElementById('ledgerIncome').value),
    expense: Number(document.getElementById('ledgerExpense').value),
    notes: document.getElementById('ledgerNotes').value || null,
  };

  try {
    const res = await fetch(`${API_BASE}/driver/ledger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to post ledger');

    closeModal('addLedgerModal');
    showToast('Daily shift ledger posted successfully!', 'success');
    await loadDriverLedgerData(state.selectedDriverId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =============================================================================
// FAMILY WELFARE DATA
// =============================================================================
async function loadDriverFamilyData(driverId = state.selectedDriverId) {
  if (!driverId) return;

  const grid = document.getElementById('driverFamilyGrid');

  try {
    const res = await fetch(`${API_BASE}/driver/family/${driverId}`);
    const result = await res.json();

    if (!result.success || !result.data) throw new Error(result.error || 'Failed to load family');

    const family = result.data || [];

    if (family.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: #FAFBFD; border: 1px dashed var(--border-light); border-radius: var(--radius-md);">
          <i class="fa-solid fa-people-roof" style="font-size: 2.5rem; color: #94A3B8; margin-bottom: 0.75rem;"></i>
          <h4 style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem;">No family beneficiaries registered</h4>
          <p style="font-size: 0.88rem; color: #64748B;">Add spouse, children, or dependents for corporate welfare protection.</p>
          <button class="btn-saas btn-saas-secondary btn-sm" style="margin-top: 1rem;" onclick="openAddFamilyForCurrentDriver()">
            <i class="fa-solid fa-plus"></i> Add Beneficiary
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = family.map((member) => {
      let icon = 'fa-user';
      if (member.relation === 'Wife' || member.relation === 'Mother') icon = 'fa-person-dress';
      else if (member.relation === 'Son' || member.relation === 'Daughter') icon = 'fa-child';

      return `
        <div class="vault-item-card" style="padding: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="vault-icon-box" style="background: #F0FDF4; border-color: #BBF7D0; color: #16A34A;">
              <i class="fa-solid ${icon}"></i>
            </div>
            <div>
              <h4 style="font-size: 1.1rem; font-weight: 800; color: #0F172A;">${escapeHtml(member.member_name)}</h4>
              <span class="status-pill-saas valid">${escapeHtml(member.relation)}</span>
              <div style="font-size: 0.78rem; color: #64748B; margin-top: 0.35rem;">
                DOB: ${member.dob || 'Not specified'}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; color: #DC2626;">${err.message}</div>`;
  }
}

function openAddFamilyForCurrentDriver() {
  if (!state.selectedDriverId) {
    showToast('Please select a driver workspace first.', 'error');
    return;
  }
  document.getElementById('familyTargetDriver').value = state.selectedDriverId;
  document.getElementById('familyMemberName').value = '';
  document.getElementById('familyDob').value = '';
  openModal('addFamilyModal');
}

async function handleAddFamily(event) {
  event.preventDefault();

  const payload = {
    driver_id: document.getElementById('familyTargetDriver').value,
    member_name: document.getElementById('familyMemberName').value,
    relation: document.getElementById('familyRelation').value,
    dob: document.getElementById('familyDob').value || null,
  };

  try {
    const res = await fetch(`${API_BASE}/admin/driver-family`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to register family member');

    closeModal('addFamilyModal');
    showToast('Welfare beneficiary registered!', 'success');
    if (state.selectedDriverId === payload.driver_id) {
      await loadDriverFamilyData(state.selectedDriverId);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =============================================================================
// ONBOARDING & DOCUMENT UPLOADS
// =============================================================================
function openCreateDriverModal() {
  document.getElementById('newFullName').value = '';
  document.getElementById('newPhone').value = '';
  document.getElementById('newEmail').value = '';
  document.getElementById('newVehicleNumber').value = '';
  document.getElementById('newVehicleModel').value = '';
  document.getElementById('newLicenseNumber').value = '';
  document.getElementById('newCustomPassword').value = '';
  openModal('createDriverModal');
}

async function handleCreateDriver(event) {
  event.preventDefault();
  const btn = document.getElementById('btnSubmitDriver');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Deploying...`;

  const payload = {
    full_name: document.getElementById('newFullName').value,
    phone: document.getElementById('newPhone').value,
    email: document.getElementById('newEmail').value || null,
    vehicle_number: document.getElementById('newVehicleNumber').value,
    vehicle_model: document.getElementById('newVehicleModel').value,
    license_number: document.getElementById('newLicenseNumber').value,
    custom_password: document.getElementById('newCustomPassword').value || null,
  };

  try {
    const res = await fetch(`${API_BASE}/admin/create-driver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to create driver');

    closeModal('createDriverModal');
    showToast('Driver workspace deployed successfully!', 'success');

    document.getElementById('credName').textContent = result.data.full_name;
    document.getElementById('credPhone').textContent = result.data.phone;
    document.getElementById('credPassword').textContent = result.data.temporary_password;
    openModal('driverCredentialsModal');

    await loadAdminFleetData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Deploy Profile';
  }
}

function copyCredentials() {
  const name = document.getElementById('credName').textContent;
  const phone = document.getElementById('credPhone').textContent;
  const pass = document.getElementById('credPassword').textContent;

  const text = `Welcome to Aaride Enterprise!\nDriver: ${name}\nLogin Phone: ${phone}\nTemporary Password: ${pass}\nPortal: ${window.location.origin}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Credentials copied to clipboard!', 'success');
  });
}

function openUploadDocModal() {
  document.getElementById('docNumber').value = '';
  document.getElementById('docFileUrl').value = '';
  document.getElementById('docIssueDate').value = '';
  document.getElementById('docExpiryDate').value = '';
  openModal('uploadDocModal');
}

function openUploadDocForSpecificDriver(driverId) {
  openUploadDocModal();
  document.getElementById('docTargetDriver').value = driverId;
}

function openUploadDocForCurrentDriver() {
  if (!state.selectedDriverId) {
    showToast('Please select a driver workspace first.', 'error');
    return;
  }
  openUploadDocForSpecificDriver(state.selectedDriverId);
}

async function handleUploadDoc(event) {
  event.preventDefault();

  const payload = {
    driver_id: document.getElementById('docTargetDriver').value,
    doc_type: document.getElementById('docType').value,
    doc_number: document.getElementById('docNumber').value || null,
    file_url: document.getElementById('docFileUrl').value,
    issue_date: document.getElementById('docIssueDate').value || null,
    expiry_date: document.getElementById('docExpiryDate').value || null,
  };

  try {
    const res = await fetch(`${API_BASE}/admin/upload-doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to upload document reference');

    closeModal('uploadDocModal');
    showToast('Document mapped to vault!', 'success');

    await loadAdminFleetData();
    if (state.selectedDriverId === payload.driver_id) {
      await loadDriverVaultCards(state.selectedDriverId);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =============================================================================
// SPLIT-SCREEN AUTH MODAL (IMAGE 2)
// =============================================================================
function openSplitAuthModal() {
  const modal = document.getElementById('splitAuthModal');
  if (modal) modal.classList.add('active');
}

function closeSplitAuthModal() {
  const modal = document.getElementById('splitAuthModal');
  if (modal) modal.classList.remove('active');
}

async function handleSplitAuthLogin(event) {
  event.preventDefault();
  const identifier = document.getElementById('authIdentifier').value.trim();
  const password = document.getElementById('authPassword').value;

  try {
    // Attempt driver login first
    const res = await fetch(`${API_BASE}/driver/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });

    const result = await res.json();

    if (res.ok && result.success) {
      closeSplitAuthModal();
      showToast(`Welcome back, ${result.data.full_name}!`, 'success');
      viewDriverWorkspace(result.data.id);
      return;
    }

    // Otherwise check admin login by email
    if (identifier.includes('@')) {
      const adminRes = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier }),
      });
      const adminResult = await adminRes.json();
      if (adminRes.ok && adminResult.success) {
        closeSplitAuthModal();
        showToast(`Welcome Admin, ${adminResult.data.full_name}!`, 'success');
        switchWindowView('admin');
        return;
      }
    }

    throw new Error(result.error || 'Invalid credentials. Please verify your phone/email and password.');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =============================================================================
// MODAL CONTROLS & UTILITIES
// =============================================================================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
  if (e.target.classList.contains('split-auth-modal')) {
    e.target.classList.remove('active');
  }
});

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}" style="color: ${type === 'success' ? '#34D399' : '#F87171'};"></i>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
