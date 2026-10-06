/**
 * AARIDE ENTERPRISE WEB PORTAL - FRONTEND LOGIC
 * Interacts directly with the Express + Supabase API
 */

// State Management
const state = {
  drivers: [],
  selectedDriverId: null,
  selectedDriver: null,
};

// API Base URL
const API_BASE = '/api';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  checkApiHealth();
  loadAdminDrivers();

  // Set default date to today for ledger form
  const todayStr = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('ledgerEntryDate');
  if (dateInput) {
    dateInput.value = todayStr;
  }
});

// =============================================================================
// API HEALTH CHECK
// =============================================================================
async function checkApiHealth() {
  const badge = document.getElementById('apiStatusBadge');
  const text = document.getElementById('apiStatusText');

  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    if (res.ok && data.status === 'ONLINE') {
      text.textContent = 'API Connected (Online)';
      badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else {
      text.textContent = 'API Degraded';
      badge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    }
  } catch (err) {
    text.textContent = 'API Offline';
    badge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
  }
}

// =============================================================================
// NAVIGATION & PORTAL SWITCHER
// =============================================================================
function switchPortal(portal) {
  const adminSection = document.getElementById('adminPortalView');
  const driverSection = document.getElementById('driverPortalView');
  const navAdminBtn = document.getElementById('navAdminBtn');
  const navDriverBtn = document.getElementById('navDriverBtn');

  if (portal === 'admin') {
    adminSection.classList.add('active');
    driverSection.classList.remove('active');
    navAdminBtn.classList.add('active');
    navDriverBtn.classList.remove('active');
  } else {
    adminSection.classList.remove('active');
    driverSection.classList.add('active');
    navAdminBtn.classList.remove('active');
    navDriverBtn.classList.add('active');

    // If no driver selected yet, select the first one automatically
    if (!state.selectedDriverId && state.drivers.length > 0) {
      onDriverSelected(state.drivers[0].id);
    }
  }
}

function switchDriverSubTab(subTab) {
  const subtabs = ['vault', 'ledger', 'family'];
  subtabs.forEach((tab) => {
    const el = document.getElementById(`subTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (el) el.classList.remove('active');
  });

  const buttons = document.querySelectorAll('.sub-tab');
  buttons.forEach((btn) => btn.classList.remove('active'));

  const activeContent = document.getElementById(`subTab${subTab.charAt(0).toUpperCase() + subTab.slice(1)}`);
  if (activeContent) activeContent.classList.add('active');

  const clickedBtn = Array.from(buttons).find((b) => b.getAttribute('onclick')?.includes(subTab));
  if (clickedBtn) clickedBtn.classList.add('active');
}

// =============================================================================
// ADMIN PORTAL: DRIVER MANAGEMENT & DIRECTORY
// =============================================================================
async function loadAdminDrivers() {
  const tbody = document.getElementById('driversTableBody');
  const counter = document.getElementById('driverTableCount');

  try {
    const res = await fetch(`${API_BASE}/admin/drivers`);
    const result = await res.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch drivers');
    }

    state.drivers = result.data;
    renderDriverMetrics(state.drivers);
    renderDriverDropdowns(state.drivers);
    renderDriverTable(state.drivers);

    counter.textContent = `${state.drivers.length} drivers`;
  } catch (err) {
    console.error('Error fetching drivers:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="table-loading" style="color: var(--color-red) !important;">
          <i class="fa-solid fa-circle-exclamation"></i> Error loading drivers: ${err.message}.<br>
          <small>Make sure you have executed schema.sql in Supabase SQL editor.</small>
        </td>
      </tr>
    `;
  }
}

function renderDriverMetrics(drivers) {
  const total = drivers.length;
  const active = drivers.filter((d) => d.is_active).length;

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

  document.getElementById('kpiTotalDrivers').textContent = total;
  document.getElementById('kpiActiveDrivers').textContent = active;
  document.getElementById('kpiTotalDocs').textContent = totalDocs;
  document.getElementById('kpiAlertDocs').textContent = alertDocs;
}

function renderDriverDropdowns(drivers) {
  const portalSelect = document.getElementById('driverSelectDropdown');
  const docTargetSelect = document.getElementById('docTargetDriver');
  const familyTargetSelect = document.getElementById('familyTargetDriver');

  const optionsHtml = drivers.map(
    (d) => `<option value="${d.id}">${d.full_name} (${d.vehicle_number})</option>`
  ).join('');

  if (portalSelect) {
    portalSelect.innerHTML = `<option value="">-- Choose a Driver --</option>` + optionsHtml;
    if (state.selectedDriverId) {
      portalSelect.value = state.selectedDriverId;
    }
  }

  if (docTargetSelect) {
    docTargetSelect.innerHTML = `<option value="">-- Choose Driver --</option>` + optionsHtml;
  }

  if (familyTargetSelect) {
    familyTargetSelect.innerHTML = `<option value="">-- Choose Driver --</option>` + optionsHtml;
  }
}

function renderDriverTable(drivers) {
  const tbody = document.getElementById('driversTableBody');

  if (!drivers || drivers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="table-loading">
          No drivers registered yet. Click <strong>"+ Onboard Driver"</strong> above to register your first vehicle.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = drivers.map((d) => {
    const docsCount = d.driver_documents ? d.driver_documents.length : 0;
    const statusPill = d.is_active
      ? `<span class="status-pill active"><i class="fa-solid fa-circle-check"></i> Active</span>`
      : `<span class="status-pill inactive"><i class="fa-solid fa-ban"></i> Suspended</span>`;

    return `
      <tr>
        <td><strong>${escapeHtml(d.full_name)}</strong></td>
        <td>
          <div>${escapeHtml(d.phone)}</div>
          <small style="color: var(--text-dim);">${escapeHtml(d.email || 'No email')}</small>
        </td>
        <td><span class="vehicle-plate">${escapeHtml(d.vehicle_number)}</span></td>
        <td>${escapeHtml(d.vehicle_model)}</td>
        <td><code style="color: var(--brand-primary);">${escapeHtml(d.license_number)}</code></td>
        <td><span class="doc-count-badge"><i class="fa-solid fa-folder-closed"></i> ${docsCount} docs</span></td>
        <td>${statusPill}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-secondary btn-sm" title="Open Driver Vault & Ledger" onclick="viewDriverDetails('${d.id}')">
              <i class="fa-solid fa-eye"></i> View Portal
            </button>
            <button class="btn btn-secondary btn-sm" title="Upload Document" onclick="openUploadDocForSpecificDriver('${d.id}')">
              <i class="fa-solid fa-cloud-arrow-up"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterDriversTable() {
  const query = document.getElementById('driverSearchInput').value.toLowerCase().trim();
  const filtered = state.drivers.filter((d) => {
    return (
      d.full_name.toLowerCase().includes(query) ||
      d.phone.toLowerCase().includes(query) ||
      d.vehicle_number.toLowerCase().includes(query) ||
      d.license_number.toLowerCase().includes(query) ||
      d.vehicle_model.toLowerCase().includes(query)
    );
  });
  renderDriverTable(filtered);
}

// =============================================================================
// MODAL & DRIVER CREATION LOGIC
// =============================================================================
function openCreateDriverModal() {
  document.getElementById('createDriverForm').reset();
  openModal('createDriverModal');
}

async function handleCreateDriver(event) {
  event.preventDefault();
  const btn = document.getElementById('btnSubmitDriver');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Registering...`;

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

    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Failed to create driver');
    }

    closeModal('createDriverModal');
    showToast('Driver onboarded successfully!', 'success');

    // Show temporary credentials modal
    document.getElementById('credName').textContent = result.data.full_name;
    document.getElementById('credPhone').textContent = result.data.phone;
    document.getElementById('credPassword').textContent = result.data.temporary_password;
    openModal('driverCredentialsModal');

    // Reload drivers list
    await loadAdminDrivers();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-check"></i> Register Driver`;
  }
}

function copyCredentials() {
  const name = document.getElementById('credName').textContent;
  const phone = document.getElementById('credPhone').textContent;
  const pass = document.getElementById('credPassword').textContent;

  const text = `Welcome to Aaride!\nDriver: ${name}\nLogin Phone: ${phone}\nTemporary Password: ${pass}\nPortal: ${window.location.origin}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Credentials copied to clipboard!', 'success');
  });
}

// =============================================================================
// DOCUMENT UPLOAD & VAULT MAPPING
// =============================================================================
function openUploadDocModal() {
  document.getElementById('uploadDocForm').reset();
  openModal('uploadDocModal');
}

function openUploadDocForSpecificDriver(driverId) {
  openUploadDocModal();
  document.getElementById('docTargetDriver').value = driverId;
}

function openUploadDocForCurrentDriver() {
  if (!state.selectedDriverId) {
    showToast('Please select a driver first.', 'error');
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
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Failed to upload document reference');
    }

    closeModal('uploadDocModal');
    showToast('Document mapped to vault successfully!', 'success');

    // Refresh views
    await loadAdminDrivers();
    if (state.selectedDriverId === payload.driver_id) {
      await loadDriverVaultData(state.selectedDriverId);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =============================================================================
// DRIVER PORTAL LOGIC
// =============================================================================
function viewDriverDetails(driverId) {
  switchPortal('driver');
  onDriverSelected(driverId);
}

async function onDriverSelected(driverId) {
  if (!driverId) return;

  state.selectedDriverId = driverId;
  const driverSelect = document.getElementById('driverSelectDropdown');
  if (driverSelect) driverSelect.value = driverId;

  state.selectedDriver = state.drivers.find((d) => d.id === driverId) || null;

  if (state.selectedDriver) {
    document.getElementById('portalDriverName').textContent = state.selectedDriver.full_name;
    document.getElementById('portalDriverVehicle').textContent = state.selectedDriver.vehicle_number;
    document.getElementById('portalDriverModel').textContent = state.selectedDriver.vehicle_model;
    document.getElementById('portalDriverLicense').textContent = state.selectedDriver.license_number;
    document.getElementById('portalDriverPhone').textContent = state.selectedDriver.phone;

    const statusPill = document.getElementById('portalDriverStatus');
    if (state.selectedDriver.is_active) {
      statusPill.className = 'status-pill active';
      statusPill.textContent = 'ACTIVE';
    } else {
      statusPill.className = 'status-pill inactive';
      statusPill.textContent = 'INACTIVE';
    }
  }

  // Fetch driver data
  await Promise.all([
    loadDriverVaultData(driverId),
    loadDriverLedgerData(driverId),
    loadDriverFamilyData(driverId),
  ]);
}

async function loadDriverVaultData(driverId) {
  const grid = document.getElementById('driverVaultGrid');

  try {
    const res = await fetch(`${API_BASE}/driver/vault/${driverId}`);
    const result = await res.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to load vault');
    }

    const docs = result.data.documents || [];

    if (docs.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-folder-open"></i>
          <h3>Vault is currently empty</h3>
          <p>No compliance documents uploaded for this vehicle yet.</p>
          <button class="btn btn-secondary mt-3" onclick="openUploadDocForCurrentDriver()">
            <i class="fa-solid fa-cloud-arrow-up"></i> Upload Document Now
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = docs.map((doc) => {
      let icon = 'fa-file-lines';
      if (doc.doc_type.includes('License')) icon = 'fa-id-card';
      else if (doc.doc_type.includes('RC')) icon = 'fa-car-side';
      else if (doc.doc_type.includes('Insurance')) icon = 'fa-shield-halved';
      else if (doc.doc_type.includes('Fitness')) icon = 'fa-wrench';

      let alertTag = `<span class="expiry-alert-tag VALID">VALID</span>`;
      if (doc.status === 'EXPIRING_SOON') {
        alertTag = `<span class="expiry-alert-tag EXPIRING_SOON"><i class="fa-solid fa-clock"></i> Expiring in ${doc.days_remaining}d</span>`;
      } else if (doc.status === 'EXPIRED') {
        alertTag = `<span class="expiry-alert-tag EXPIRED"><i class="fa-solid fa-triangle-exclamation"></i> EXPIRED (${Math.abs(doc.days_remaining)}d ago)</span>`;
      }

      return `
        <div class="vault-card">
          <div>
            <div class="vault-card-top">
              <div class="doc-type-icon">
                <i class="fa-solid ${icon}"></i>
              </div>
              ${alertTag}
            </div>
            <div class="vault-card-body">
              <h4>${escapeHtml(doc.doc_type)}</h4>
              <div class="doc-num">Doc No: ${escapeHtml(doc.doc_number || 'N/A')}</div>
              <div class="doc-meta">
                <div class="doc-meta-row">
                  <span>Issue Date:</span>
                  <strong>${doc.issue_date || 'Not recorded'}</strong>
                </div>
                <div class="doc-meta-row">
                  <span>Expiry Date:</span>
                  <strong style="color: ${doc.status === 'EXPIRED' ? 'var(--color-red)' : doc.status === 'EXPIRING_SOON' ? 'var(--color-amber)' : 'inherit'};">
                    ${doc.expiry_date || 'No Expiry'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
          <div class="vault-card-footer">
            <a href="${escapeHtml(doc.file_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> View Document
            </a>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><p style="color: var(--color-red);">${err.message}</p></div>`;
  }
}

// =============================================================================
// FINANCIAL LEDGER
// =============================================================================
async function loadDriverLedgerData(driverId = state.selectedDriverId) {
  if (!driverId) return;

  const tbody = document.getElementById('ledgerTableBody');

  try {
    const res = await fetch(`${API_BASE}/driver/ledger/${driverId}`);
    const result = await res.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch ledger');
    }

    const { summary, records } = result.data;

    // Update Summary KPI Cards
    document.getElementById('ledgerTotalIncome').textContent = `₹${(summary.total_income || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('ledgerTotalExpense').textContent = `₹${(summary.total_expense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    
    const profitEl = document.getElementById('ledgerNetProfit');
    profitEl.textContent = `₹${(summary.net_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (summary.net_profit >= 0) {
      profitEl.className = 'metric-amount text-emerald';
    } else {
      profitEl.className = 'metric-amount text-red';
    }

    document.getElementById('ledgerDaysLogged').textContent = summary.total_days_logged || 0;

    // Render Records
    if (!records || records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="table-loading">
            No financial entries logged yet. Click <strong>"+ Add Daily Entry"</strong> to record today's earnings.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = records.map((entry) => {
      const net = Number(entry.net_profit || 0);
      const netClass = net >= 0 ? 'text-emerald' : 'text-red';
      return `
        <tr>
          <td><strong>${entry.entry_date}</strong></td>
          <td class="text-emerald">₹${Number(entry.income).toFixed(2)}</td>
          <td class="text-red">₹${Number(entry.expense).toFixed(2)}</td>
          <td class="${netClass}"><strong>₹${net.toFixed(2)}</strong></td>
          <td>${escapeHtml(entry.notes || '-')}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-loading" style="color: var(--color-red);">${err.message}</td></tr>`;
  }
}

function openAddLedgerModal() {
  if (!state.selectedDriverId) {
    showToast('Please select a driver first.', 'error');
    return;
  }
  document.getElementById('addLedgerForm').reset();
  document.getElementById('ledgerEntryDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('modalProfitPreview').textContent = '₹0.00';
  openModal('addLedgerModal');
}

function calculateModalProfitPreview() {
  const inc = Number(document.getElementById('ledgerIncome').value) || 0;
  const exp = Number(document.getElementById('ledgerExpense').value) || 0;
  const profit = inc - exp;
  const el = document.getElementById('modalProfitPreview');
  el.textContent = `₹${profit.toFixed(2)}`;
  el.className = profit >= 0 ? 'text-emerald' : 'text-red';
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
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Failed to save ledger entry');
    }

    closeModal('addLedgerModal');
    showToast('Daily ledger entry saved!', 'success');
    await loadDriverLedgerData(state.selectedDriverId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =============================================================================
// FAMILY & WELFARE
// =============================================================================
async function loadDriverFamilyData(driverId = state.selectedDriverId) {
  if (!driverId) return;

  const grid = document.getElementById('driverFamilyGrid');

  try {
    const res = await fetch(`${API_BASE}/driver/family/${driverId}`);
    const result = await res.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch family');
    }

    const family = result.data || [];

    if (family.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-people-roof"></i>
          <h3>No family members listed</h3>
          <p>Register family members for welfare benefits and group insurance schemes.</p>
          <button class="btn btn-secondary mt-3" onclick="openAddFamilyForCurrentDriver()">
            <i class="fa-solid fa-user-plus"></i> Add Family Member
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
        <div class="family-card">
          <div class="family-avatar">
            <i class="fa-solid ${icon}"></i>
          </div>
          <div class="family-info">
            <h4>${escapeHtml(member.member_name)}</h4>
            <span class="family-relation">${escapeHtml(member.relation)}</span>
            <div style="font-size: 0.78rem; color: var(--text-dim); margin-top: 0.25rem;">
              DOB: ${member.dob || 'Not specified'}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><p style="color: var(--color-red);">${err.message}</p></div>`;
  }
}

function openAddFamilyForCurrentDriver() {
  if (!state.selectedDriverId) {
    showToast('Please select a driver first.', 'error');
    return;
  }
  document.getElementById('addFamilyForm').reset();
  document.getElementById('familyTargetDriver').value = state.selectedDriverId;
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
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Failed to add family member');
    }

    closeModal('addFamilyModal');
    showToast('Family member registered!', 'success');
    if (state.selectedDriverId === payload.driver_id) {
      await loadDriverFamilyData(state.selectedDriverId);
    }
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

// Close modals when clicking backdrop
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('active');
  }
});

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
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
