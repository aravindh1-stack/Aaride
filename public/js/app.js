/**
 * AARIDE ENTERPRISE OPERATING SYSTEM
 * Complete Client Engine for:
 * 1. Landing Page -> Login Page -> Role-Based Dashboard Routing
 * 2. Driver Dashboard (View verified files, Edit metadata only, Shift Ledger)
 * 3. Admin Dashboard (Fleet Management, Unique Username/Password Generation)
 */

const state = {
  currentUser: null,       // { id, role: 'admin' | 'driver', full_name, username, ... }
  drivers: [],             // Admin fleet list
  currentDriverVault: [],  // Logged-in driver's documents
  currentDriverLedger: [], // Logged-in driver's ledger records
};

const API_BASE = '/api';

// =============================================================================
// INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkApiHealth();
  initRouter();
  loadLandingKpis();

  // Set today's date on date inputs
  const today = new Date().toISOString().split('T')[0];
  const shiftInput = document.getElementById('driverShiftDate');
  if (shiftInput) shiftInput.value = today;
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
      text.textContent = 'Live';
      pill.style.background = 'var(--status-green-bg)';
      pill.style.borderColor = 'var(--status-green-border)';
      pill.style.color = 'var(--status-green-text)';
    } else {
      text.textContent = 'Degraded';
      pill.style.background = 'var(--status-amber-bg)';
      pill.style.borderColor = 'var(--status-amber-border)';
      pill.style.color = 'var(--status-amber-text)';
    }
  } catch (err) {
    text.textContent = 'Offline';
    pill.style.background = 'var(--status-red-bg)';
    pill.style.borderColor = 'var(--status-red-border)';
    pill.style.color = 'var(--status-red-text)';
  }
}

async function loadLandingKpis() {
  try {
    const res = await fetch(`${API_BASE}/admin/drivers`);
    const result = await res.json();
    if (result.success && result.data) {
      state.drivers = result.data;
      const count = result.data.length;
      let totalDocs = 0;
      result.data.forEach((d) => totalDocs += (d.driver_documents?.length || 0));

      const driversEl = document.getElementById('landingKpiDrivers');
      const docsEl = document.getElementById('landingKpiDocs');
      if (driversEl && count > 0) driversEl.textContent = count;
      if (docsEl && totalDocs > 0) docsEl.textContent = totalDocs.toLocaleString('en-IN');
    }
  } catch (err) {
    // Non-blocking for landing preview
  }
}

// =============================================================================
// CLIENT ROUTER (LANDING -> LOGIN -> DRIVER DASHBOARD / ADMIN DASHBOARD)
// =============================================================================
function initRouter() {
  // Check persisted session
  const savedSession = localStorage.getItem('aaride_session');
  if (savedSession) {
    try {
      state.currentUser = JSON.parse(savedSession);
      updateNavbarSession(state.currentUser);

      // Route based on role
      if (state.currentUser.role === 'admin') {
        navigateTo('admin', false);
        return;
      } else if (state.currentUser.role === 'driver') {
        navigateTo('driver', false);
        return;
      }
    } catch (e) {
      localStorage.removeItem('aaride_session');
    }
  }

  // Handle hash changes
  window.addEventListener('hashchange', handleHashRouting);
  handleHashRouting();
}

function handleHashRouting() {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  if (hash === 'login') {
    navigateTo('login', false);
  } else if (hash === 'admin') {
    if (state.currentUser?.role === 'admin') {
      navigateTo('admin', false);
    } else {
      navigateTo('login', false);
    }
  } else if (hash === 'driver') {
    if (state.currentUser?.role === 'driver') {
      navigateTo('driver', false);
    } else {
      navigateTo('login', false);
    }
  } else {
    navigateTo('landing', false);
  }
}

function navigateTo(viewName, updateHash = true) {
  const views = ['landing', 'login', 'driver', 'admin'];

  views.forEach((v) => {
    const el = document.getElementById(`view${v.charAt(0).toUpperCase() + v.slice(1)}` + (v === 'driver' || v === 'admin' ? 'Dashboard' : ''));
    if (el) el.classList.remove('active');
  });

  let targetId = '';
  if (viewName === 'landing') targetId = 'viewLanding';
  else if (viewName === 'login') targetId = 'viewLogin';
  else if (viewName === 'driver') targetId = 'viewDriverDashboard';
  else if (viewName === 'admin') targetId = 'viewAdminDashboard';

  const targetEl = document.getElementById(targetId);
  if (targetEl) targetEl.classList.add('active');

  if (updateHash) {
    window.location.hash = `#/${viewName}`;
  }

  window.scrollTo({ top: 0, behavior: 'instant' });

  // Trigger data fetch for dashboard views
  if (viewName === 'admin') {
    loadAdminDashboardData();
  } else if (viewName === 'driver') {
    renderDriverProfileInfo();
    loadDriverPersonalVault();
    loadDriverPersonalLedger();
    loadDriverPersonalFamily();
  }
}

function navigateToUserDashboard() {
  if (state.currentUser?.role === 'admin') {
    navigateTo('admin');
  } else if (state.currentUser?.role === 'driver') {
    navigateTo('driver');
  } else {
    navigateTo('login');
  }
}

function updateNavbarSession(user) {
  const navGuest = document.getElementById('navGuestActions');
  const navUser = document.getElementById('navUserActions');
  const navPublic = document.getElementById('navPublic');
  const navAuth = document.getElementById('navAuthenticated');

  if (user) {
    if (navGuest) navGuest.style.display = 'none';
    if (navUser) navUser.style.display = 'flex';
    if (navPublic) navPublic.style.display = 'none';
    if (navAuth) navAuth.style.display = 'flex';

    const nameEl = document.getElementById('navUserName');
    const roleEl = document.getElementById('navUserRole');
    if (nameEl) nameEl.textContent = user.full_name || user.username || 'User';
    if (roleEl) roleEl.textContent = user.role === 'admin' ? 'ADMIN' : 'DRIVER';
  } else {
    if (navGuest) navGuest.style.display = 'flex';
    if (navUser) navUser.style.display = 'none';
    if (navPublic) navPublic.style.display = 'flex';
    if (navAuth) navAuth.style.display = 'none';
  }
}

function handleSignOut() {
  localStorage.removeItem('aaride_session');
  state.currentUser = null;
  updateNavbarSession(null);
  showToast('You have signed out.', 'success');
  navigateTo('landing');
}

// =============================================================================
// UNIVERSAL AUTHENTICATION
// if (auth == driver) -> Driver Dashboard
// else if (auth == admin) -> Admin Dashboard
// else -> Invalid user or not registered user
// =============================================================================
async function handleUniversalLogin(event) {
  event.preventDefault();
  const btn = document.getElementById('btnLoginSubmit');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;

  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });

    const result = await res.json();

    if (!res.ok || !result.success || !result.data) {
      throw new Error(result.error || 'Invalid user or not a registered user.');
    }

    const { role, user } = result.data;
    state.currentUser = { ...user, role };

    // Persist session
    localStorage.setItem('aaride_session', JSON.stringify(state.currentUser));
    updateNavbarSession(state.currentUser);

    showToast(`Welcome back, ${user.full_name}!`, 'success');

    // Role-based redirect logic
    if (role === 'driver') {
      navigateTo('driver');
    } else if (role === 'admin') {
      navigateTo('admin');
    } else {
      throw new Error('Unrecognized user role.');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Sign In';
  }
}

function fillDemoCredentials(role) {
  const identInput = document.getElementById('loginIdentifier');
  const passInput = document.getElementById('loginPassword');

  if (role === 'admin') {
    identInput.value = 'admin@aaride.com';
    passInput.value = 'Admin#2026';
    showToast('Admin credentials filled. Click Sign In.', 'success');
  } else if (role === 'driver') {
    if (state.drivers.length > 0) {
      const firstDriver = state.drivers[0];
      identInput.value = firstDriver.username || firstDriver.phone;
      passInput.value = 'Aa#Demo2026';
      showToast(`Filled driver: ${firstDriver.full_name}. Enter registered password.`, 'success');
    } else {
      identInput.value = 'murugan.selvam';
      passInput.value = 'Aa#Demo2026';
      showToast('Enter your registered driver username/phone and password.', 'success');
    }
  }
}

// =============================================================================
// DRIVER DASHBOARD (VIEW PERSONAL VAULT, EDIT METADATA ONLY, DAILY SHIFT LEDGER)
// =============================================================================
function renderDriverProfileInfo() {
  if (!state.currentUser) return;
  const user = state.currentUser;

  const nameEl = document.getElementById('driverDashName');
  const userEl = document.getElementById('driverDashUsername');
  const vehEl = document.getElementById('driverDashVehicle');
  const modEl = document.getElementById('driverDashModel');
  const licEl = document.getElementById('driverDashLicense');
  const phEl = document.getElementById('driverDashPhone');

  if (nameEl) nameEl.textContent = user.full_name || 'Driver Workspace';
  if (userEl) userEl.textContent = user.username || user.phone || '-';
  if (vehEl) vehEl.textContent = user.vehicle_number || 'N/A';
  if (modEl) modEl.textContent = user.vehicle_model || 'N/A';
  if (licEl) licEl.textContent = user.license_number || 'N/A';
  if (phEl) phEl.textContent = user.phone || 'N/A';
}

function switchDriverDashTab(tab) {
  const tabs = ['vault', 'ledger', 'family'];
  tabs.forEach((t) => {
    const section = document.getElementById(`driverDashTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const btn = document.getElementById(`tabDriver${t.charAt(0).toUpperCase() + t.slice(1)}Btn`);
    if (section) section.style.display = t === tab ? 'block' : 'none';
    if (btn) {
      if (t === tab) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
}

/**
 * Driver can ONLY view the docs uploaded by admin for their account
 */
async function loadDriverPersonalVault() {
  if (!state.currentUser) return;
  const driverId = state.currentUser.id;
  const grid = document.getElementById('driverPersonalVaultGrid');

  try {
    const res = await fetch(`${API_BASE}/driver/vault/${driverId}`);
    const result = await res.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch personal vault');
    }

    state.currentDriverVault = result.data.documents || [];

    if (state.currentDriverVault.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: #FFFFFF; border: 1px dashed var(--border-light); border-radius: var(--radius-md);">
          <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: #94A3B8; margin-bottom: 0.75rem;"></i>
          <h4 style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem;">No compliance documents registered yet</h4>
          <p style="font-size: 0.88rem; color: #64748B;">Your administrator will upload your verified vehicle RC Book, License, and Insurance.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = state.currentDriverVault.map((doc) => {
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
            <div class="vault-item-docnum">Doc No: <strong>${escapeHtml(doc.doc_number || 'N/A')}</strong></div>

            <div class="vault-dates-box">
              <div class="vault-date-line">
                <span>Start Date (Issue):</span>
                <strong>${doc.issue_date || 'Not recorded'}</strong>
              </div>
              <div class="vault-date-line">
                <span>End Date (Expiry):</span>
                <strong style="color: ${doc.status === 'EXPIRED' ? '#DC2626' : doc.status === 'EXPIRING_SOON' ? '#D97706' : '#0F172A'};">
                  ${doc.expiry_date || 'No Expiry'}
                </strong>
              </div>
            </div>
          </div>

          <!-- Actions: Open certified file + Edit metadata (dates & numbers) -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle); gap: 0.5rem;">
            <a href="${escapeHtml(doc.file_url)}" target="_blank" rel="noopener noreferrer" class="btn-saas btn-saas-secondary btn-sm" title="View certified uploaded document">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> View File
            </a>
            <button class="btn-saas btn-saas-primary btn-sm" onclick="openEditDocModal('${doc.id}')">
              <i class="fa-solid fa-pen-to-square"></i> Edit Dates & No.
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; color: #DC2626; padding: 2rem;">${err.message}</div>`;
  }
}

/**
 * Driver Document Metadata Editor Modal
 * CAN edit start date, end date, doc number
 * CANNOT edit or replace the file_url
 */
function openEditDocModal(docId) {
  const doc = state.currentDriverVault.find((d) => d.id === docId);
  if (!doc) {
    showToast('Document not found in personal vault.', 'error');
    return;
  }

  document.getElementById('editDocId').value = doc.id;
  document.getElementById('editDocType').value = doc.doc_type;
  document.getElementById('editDocNumber').value = doc.doc_number || '';
  document.getElementById('editDocIssueDate').value = doc.issue_date || '';
  document.getElementById('editDocExpiryDate').value = doc.expiry_date || '';

  const preview = document.getElementById('editDocFileUrlPreview');
  const link = document.getElementById('editDocFileUrlLink');
  if (preview) preview.textContent = doc.file_url;
  if (link) link.href = doc.file_url;

  openModal('editDocMetadataModal');
}

async function handleSaveDocMetadata(event) {
  event.preventDefault();
  const docId = document.getElementById('editDocId').value;
  if (!docId) return;

  const payload = {
    driver_id: state.currentUser.id,
    doc_number: document.getElementById('editDocNumber').value,
    issue_date: document.getElementById('editDocIssueDate').value || null,
    expiry_date: document.getElementById('editDocExpiryDate').value,
  };

  try {
    const res = await fetch(`${API_BASE}/driver/document/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Failed to update document metadata');
    }

    closeModal('editDocMetadataModal');
    showToast('Document dates and reference number updated successfully!', 'success');
    await loadDriverPersonalVault();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Daily Shift Ledger
async function loadDriverPersonalLedger() {
  if (!state.currentUser) return;
  const driverId = state.currentUser.id;
  const tbody = document.getElementById('driverPersonalLedgerTableBody');

  try {
    const res = await fetch(`${API_BASE}/driver/ledger/${driverId}`);
    const result = await res.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch ledger');
    }

    const { summary, records } = result.data;

    document.getElementById('driverLedgerIncome').textContent = `₹${(summary.total_income || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('driverLedgerExpense').textContent = `₹${(summary.total_expense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    
    const profitEl = document.getElementById('driverLedgerProfit');
    profitEl.textContent = `₹${(summary.net_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    profitEl.style.color = summary.net_profit >= 0 ? '#059669' : '#DC2626';

    document.getElementById('driverLedgerDays').textContent = summary.total_days_logged || 0;

    if (!records || records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2.5rem; color: #64748B;">
            No daily shift entries logged yet. Click <strong>"Record Shift Entry"</strong> to record today's earnings.
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

function openDriverAddLedgerModal() {
  document.getElementById('driverShiftDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('driverShiftIncome').value = '';
  document.getElementById('driverShiftExpense').value = '';
  document.getElementById('driverShiftNotes').value = '';
  document.getElementById('driverModalProfitPreview').textContent = '₹0.00';
  openModal('driverAddLedgerModal');
}

function calculateDriverModalProfit() {
  const inc = Number(document.getElementById('driverShiftIncome').value) || 0;
  const exp = Number(document.getElementById('driverShiftExpense').value) || 0;
  const profit = inc - exp;
  const el = document.getElementById('driverModalProfitPreview');
  el.textContent = `₹${profit.toFixed(2)}`;
  el.style.color = profit >= 0 ? '#166534' : '#DC2626';
}

async function handleDriverAddLedger(event) {
  event.preventDefault();
  if (!state.currentUser) return;

  const payload = {
    driver_id: state.currentUser.id,
    entry_date: document.getElementById('driverShiftDate').value,
    income: Number(document.getElementById('driverShiftIncome').value),
    expense: Number(document.getElementById('driverShiftExpense').value),
    notes: document.getElementById('driverShiftNotes').value || null,
  };

  try {
    const res = await fetch(`${API_BASE}/driver/ledger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to post ledger');

    closeModal('driverAddLedgerModal');
    showToast('Shift ledger entry posted successfully!', 'success');
    await loadDriverPersonalLedger();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Family Welfare
async function loadDriverPersonalFamily() {
  if (!state.currentUser) return;
  const driverId = state.currentUser.id;
  const grid = document.getElementById('driverPersonalFamilyGrid');

  try {
    const res = await fetch(`${API_BASE}/driver/family/${driverId}`);
    const result = await res.json();

    if (!result.success || !result.data) throw new Error(result.error || 'Failed to load family');

    const family = result.data || [];

    if (family.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: #FFFFFF; border: 1px dashed var(--border-light); border-radius: var(--radius-md);">
          <i class="fa-solid fa-people-roof" style="font-size: 2.5rem; color: #94A3B8; margin-bottom: 0.75rem;"></i>
          <h4 style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem;">No family beneficiaries registered</h4>
          <p style="font-size: 0.88rem; color: #64748B;">Please contact administration to register family members for corporate healthcare coverage.</p>
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

// =============================================================================
// ADMIN DASHBOARD (FLEET DIRECTORY, UNIQUE ONBOARDING, DOCUMENT UPLOADS)
// =============================================================================
async function loadAdminDashboardData() {
  const tbody = document.getElementById('adminFleetTableBody');
  const countNotice = document.getElementById('adminTableCount');

  try {
    const res = await fetch(`${API_BASE}/admin/drivers`);
    const result = await res.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch drivers');
    }

    state.drivers = result.data;

    // Update KPI metrics
    const totalDrivers = state.drivers.length;
    let totalDocs = 0;
    let alertDocs = 0;
    const now = new Date();

    state.drivers.forEach((d) => {
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

    document.getElementById('adminKpiDrivers').textContent = totalDrivers;
    document.getElementById('adminKpiVaultDocs').textContent = totalDocs.toLocaleString('en-IN');
    document.getElementById('adminKpiAlertDocs').textContent = alertDocs;
    if (countNotice) countNotice.textContent = `${totalDrivers} registered drivers`;

    // Populate dropdowns in modals
    populateAdminModalsDrivers(state.drivers);

    // Render Table
    renderAdminFleetTable(state.drivers);
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: #DC2626;">
          <i class="fa-solid fa-circle-exclamation"></i> Error loading fleet data: ${err.message}
        </td>
      </tr>
    `;
  }
}

function renderAdminFleetTable(drivers) {
  const tbody = document.getElementById('adminFleetTableBody');

  if (!drivers || drivers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: #64748B;">
          No drivers onboarded yet. Click <strong>"+ Onboard Driver"</strong> above to register your first vehicle.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = drivers.map((d) => {
    const docsCount = d.driver_documents ? d.driver_documents.length : 0;
    const statusPill = d.is_active
      ? `<span class="status-pill-saas allocated"><i class="fa-solid fa-circle-check"></i> Active</span>`
      : `<span class="status-pill-saas pending"><i class="fa-solid fa-ban"></i> Suspended</span>`;

    return `
      <tr>
        <td>
          <div class="driver-cell-name">${escapeHtml(d.full_name)}</div>
          <div class="driver-cell-sub">
            <span style="font-weight: 700; color: var(--brand-teal);">@${escapeHtml(d.username || 'driver')}</span>
          </div>
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
        <td><span class="status-pill-saas valid">${docsCount} docs</span></td>
        <td>${statusPill}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn-saas btn-saas-secondary btn-sm" title="Upload Document" onclick="openAdminUploadDocForSpecific('${d.id}')">
              <i class="fa-solid fa-cloud-arrow-up"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminFleetTable() {
  const query = document.getElementById('adminDirectorySearch').value.toLowerCase().trim();
  const filtered = state.drivers.filter((d) => {
    return (
      d.full_name.toLowerCase().includes(query) ||
      (d.username && d.username.toLowerCase().includes(query)) ||
      d.phone.toLowerCase().includes(query) ||
      d.vehicle_number.toLowerCase().includes(query) ||
      d.license_number.toLowerCase().includes(query) ||
      d.vehicle_model.toLowerCase().includes(query)
    );
  });
  renderAdminFleetTable(filtered);
}

function populateAdminModalsDrivers(drivers) {
  const select = document.getElementById('adminDocDriverSelect');
  if (select) {
    const opts = drivers.map((d) => `<option value="${d.id}">${d.full_name} (@${d.username || d.phone}) - ${d.vehicle_number}</option>`).join('');
    select.innerHTML = `<option value="">-- Choose Driver --</option>` + opts;
  }
}

// Onboard Driver Modal
function openAdminOnboardModal() {
  document.getElementById('onboardFullName').value = '';
  document.getElementById('onboardPhone').value = '';
  document.getElementById('onboardEmail').value = '';
  document.getElementById('onboardVehicleNumber').value = '';
  document.getElementById('onboardVehicleModel').value = '';
  document.getElementById('onboardLicenseNumber').value = '';
  openModal('adminOnboardDriverModal');
}

/**
 * Onboard Driver: Generates unique username & password guaranteed not to collide with prior users
 */
async function handleAdminOnboardDriver(event) {
  event.preventDefault();
  const btn = document.getElementById('btnAdminOnboardSubmit');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating Unique Credentials...`;

  const payload = {
    full_name: document.getElementById('onboardFullName').value,
    phone: document.getElementById('onboardPhone').value,
    email: document.getElementById('onboardEmail').value || null,
    vehicle_number: document.getElementById('onboardVehicleNumber').value,
    vehicle_model: document.getElementById('onboardVehicleModel').value,
    license_number: document.getElementById('onboardLicenseNumber').value,
  };

  try {
    const res = await fetch(`${API_BASE}/admin/create-driver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to onboard driver');

    closeModal('adminOnboardDriverModal');
    showToast('Driver onboarded with unique credentials!', 'success');

    // Display generated unique username and temporary password
    document.getElementById('credName').textContent = result.data.full_name;
    document.getElementById('credUsername').textContent = `@${result.data.username}`;
    document.getElementById('credPhone').textContent = result.data.phone;
    document.getElementById('credPassword').textContent = result.data.temporary_password;
    openModal('driverCredentialsModal');

    await loadAdminDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Generate Credentials & Onboard';
  }
}

function copyCredentials() {
  const name = document.getElementById('credName').textContent;
  const username = document.getElementById('credUsername').textContent;
  const phone = document.getElementById('credPhone').textContent;
  const pass = document.getElementById('credPassword').textContent;

  const text = `Welcome to Aaride!\nDriver: ${name}\nUsername: ${username}\nLogin Phone: ${phone}\nTemporary Password: ${pass}\nPortal: ${window.location.origin}/#/login`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Credentials copied to clipboard!', 'success');
  });
}

// Upload Document Modal & File Handling
function handleFileSelection(event) {
  const file = event.target.files ? event.target.files[0] : null;
  const badge = document.getElementById('fileSelectedBadge');
  const nameEl = document.getElementById('fileSelectedName');
  if (file && badge && nameEl) {
    nameEl.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    badge.style.display = 'inline-block';
  } else if (badge) {
    badge.style.display = 'none';
  }
}

function openAdminUploadDocModal() {
  document.getElementById('adminDocNumber').value = '';
  const fileInput = document.getElementById('adminDocFileInput');
  if (fileInput) fileInput.value = '';
  const badge = document.getElementById('fileSelectedBadge');
  if (badge) badge.style.display = 'none';
  document.getElementById('adminDocIssueDate').value = '';
  document.getElementById('adminDocExpiryDate').value = '';
  openModal('adminUploadDocModal');
}

function openAdminUploadDocForSpecific(driverId) {
  openAdminUploadDocModal();
  document.getElementById('adminDocDriverSelect').value = driverId;
}

async function handleAdminUploadDoc(event) {
  event.preventDefault();

  const driverId = document.getElementById('adminDocDriverSelect').value;
  const docType = document.getElementById('adminDocType').value;
  const docNumber = document.getElementById('adminDocNumber').value || '';
  const fileInput = document.getElementById('adminDocFileInput');
  const issueDate = document.getElementById('adminDocIssueDate').value || '';
  const expiryDate = document.getElementById('adminDocExpiryDate').value || '';

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Please select a document file (PDF, PNG, JPG) to upload.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('driver_id', driverId);
  formData.append('doc_type', docType);
  if (docNumber) formData.append('doc_number', docNumber);
  formData.append('file', fileInput.files[0]);
  if (issueDate) formData.append('issue_date', issueDate);
  if (expiryDate) formData.append('expiry_date', expiryDate);

  try {
    showToast('Uploading document to Supabase Storage...', 'info');
    const res = await fetch(`${API_BASE}/admin/upload-doc`, {
      method: 'POST',
      body: formData,
    });

    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to upload document to Supabase vault');

    closeModal('adminUploadDocModal');
    showToast('Document successfully uploaded to Supabase & saved to vault!', 'success');
    await loadAdminDashboardData();
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
});

window.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.querySelector('.file-upload-dropzone');
  const fileInput = document.getElementById('adminDocFileInput');
  if (dropzone && fileInput) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });
    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length) {
        fileInput.files = dt.files;
        handleFileSelection({ target: fileInput });
      }
    });
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

// =============================================================================
// THEME MANAGEMENT (DARK / LIGHT MODE - AARCODE DESIGN)
// =============================================================================
function initTheme() {
  const savedTheme = localStorage.getItem('aaride_theme') || 'dark';
  setTheme(savedTheme);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('aaride_theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    if (theme === 'light') {
      icon.className = 'fa-solid fa-moon';
    } else {
      icon.className = 'fa-solid fa-sun';
    }
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const target = current === 'dark' ? 'light' : 'dark';
  setTheme(target);
}

// =============================================================================
// FAQ ACCORDION (AARCODE REPLICA)
// =============================================================================
function toggleFaq(headerEl) {
  const item = headerEl.closest('.faq-item');
  if (item) {
    item.classList.toggle('active');
  }
}

