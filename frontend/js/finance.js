/**
 * Finance Module — Zoho Books Style
 * Upgraded to enterprise-grade revenue management
 */

let invoicesData = [];
let financeAnalytics = null;
let currentFinanceView = 'invoices';

/**
 * Home View — Financial Dashboard
 */
async function renderFinanceHome(container) {
  const res = await api.expenses.analytics();
  if (!res.ok) return;
  const d = res.data.data;
  const net = (d.revenue?.totalRevenue || 0) - (d.expenses?.totalExpenses || 0);

  container.innerHTML = `
    <div class="books-container">
      <div class="section-header" style="margin-bottom:24px">
        <div>
          <div class="section-title">Finance Dashboard</div>
          <div class="section-sub">Real-time business health and cash flow</div>
        </div>
      </div>

      <div class="books-revenue-grid">
        <div class="revenue-card">
          <div class="revenue-label">Total Receivables</div>
          <div class="revenue-value">${formatCurrency(d.revenue?.totalPending || 0)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:5px">Pending from ${d.revenue?.invoiceCount || 0} invoices</div>
        </div>
        <div class="revenue-card">
          <div class="revenue-label">Total Sales (MTD)</div>
          <div class="revenue-value" style="color:var(--green)">${formatCurrency(d.revenue?.totalRevenue || 0)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:5px">Revenue generated this month</div>
        </div>
        <div class="revenue-card">
          <div class="revenue-label">Total Expenses</div>
          <div class="revenue-value" style="color:var(--red)">${formatCurrency(d.expenses?.totalExpenses || 0)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:5px">Operating costs recorded</div>
        </div>
        <div class="revenue-card" style="background:var(--accent); color:white">
          <div class="revenue-label" style="color:rgba(255,255,255,0.8)">Net Cash Flow</div>
          <div class="revenue-value" style="color:white">${formatCurrency(net)}</div>
          <div style="font-size:0.75rem; color:rgba(255,255,255,0.6); margin-top:5px">Profit/Loss margin</div>
        </div>
      </div>

      <div class="charts-grid" style="margin-top:30px">
        <div class="chart-card">
          <div class="chart-title">Income vs Expenses</div>
          <div style="height:250px; display:flex; align-items:center; justify-content:center">
             <canvas id="financeOverviewChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Receivables by Client</div>
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>Client</th><th>Pending Amount</th></tr></thead>
              <tbody id="top-receivables-tbody"><tr><td colspan="2">Loading...</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render Mini Chart
  const ctx = document.getElementById('financeOverviewChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Sales', 'Expenses'],
      datasets: [{
        label: 'Amount',
        data: [d.revenue?.totalRevenue || 0, d.expenses?.totalExpenses || 0],
        backgroundColor: ['#10b981', '#f87171'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // Load top receivables
  const invRes = await api.invoices.list({ status: 'sent' });
  if (invRes.ok) {
    const top = invRes.data.data.slice(0, 5);
    document.getElementById('top-receivables-tbody').innerHTML = top.map(i => `
      <tr><td>${i.clientName}</td><td class="td-mono">${formatCurrency(i.balanceDue)}</td></tr>
    `).join('') || '<tr><td colspan="2">No pending receivables</td></tr>';
  }
}

/**
 * Sales View — Revenue Management
 */
async function renderFinanceSales(container) {
  container.innerHTML = `
    <div class="books-container">
      <div class="section-header" style="margin-bottom:24px">
        <div>
          <div class="section-title">Sales Overview</div>
          <div class="section-sub">Monitor revenue and customer payments</div>
        </div>
        <div class="header-actions">
           <button class="btn btn-primary" onclick="navigateTo('books-invoices')">View Invoices</button>
           <button class="btn btn-secondary" onclick="openInvoiceForm()">+ New Invoice</button>
        </div>
      </div>

      <div class="table-card">
        <div class="table-header"><div class="table-title">Recent Payments Received</div></div>
        <div class="table-container">
           <table class="data-table">
              <thead><tr><th>Date</th><th>Ref#</th><th>Client</th><th>Invoice</th><th>Amount</th></tr></thead>
              <tbody id="sales-payments-tbody"><tr><td colspan="5">Loading...</td></tr></tbody>
           </table>
        </div>
      </div>
    </div>
  `;

  const res = await api.payments.list();
  const tbody = document.getElementById('sales-payments-tbody');
  if (res.ok && res.data.data.length > 0) {
    tbody.innerHTML = res.data.data.map(p => `
      <tr>
        <td>${formatDate(p.paymentDate)}</td>
        <td class="td-mono">${p.paymentId}</td>
        <td style="font-weight:600">${p.clientName}</td>
        <td>${p.invoiceNumber}</td>
        <td class="td-mono" style="color:var(--green); font-weight:700">${formatCurrency(p.amount)}</td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px">No payments recorded yet.</td></tr>`;
  }
}

/**
 * Payments View — Detailed Receipt Log
 */
async function renderFinancePayments(container) {
  container.innerHTML = `
    <div class="books-container">
      <div class="section-header" style="margin-bottom:24px">
        <div>
          <div class="section-title">Payments Received</div>
          <div class="section-sub">Detailed log of all client transactions</div>
        </div>
      </div>

      <div class="table-card">
        <div class="table-container">
           <table class="data-table">
              <thead><tr>
                <th>Date</th><th>Payment#</th><th>Customer Name</th><th>Invoice#</th>
                <th>Mode</th><th>Reference</th><th>Amount</th>
              </tr></thead>
              <tbody id="payments-log-tbody"><tr><td colspan="7">Loading...</td></tr></tbody>
           </table>
        </div>
      </div>
    </div>
  `;

  const res = await api.payments.list();
  const tbody = document.getElementById('payments-log-tbody');
  if (res.ok && res.data.data.length > 0) {
    tbody.innerHTML = res.data.data.map(p => `
      <tr>
        <td>${formatDate(p.paymentDate)}</td>
        <td class="td-mono" style="color:var(--accent); font-weight:700">${p.paymentId}</td>
        <td style="font-weight:600">${p.clientName}</td>
        <td>${p.invoiceNumber}</td>
        <td><span class="badge badge-gray">${(p.paymentMethod || 'Other').toUpperCase()}</span></td>
        <td style="color:var(--text-muted)">${p.transactionId || '—'}</td>
        <td class="td-mono" style="color:var(--green); font-weight:800">${formatCurrency(p.amount)}</td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px">No payment records found.</td></tr>`;
  }
}

/**
 * Invoices View — Existing Logic
 */
async function renderFinanceInvoices(container) {
  container.innerHTML = `
    <div class="books-container">
      <div class="section-header">
        <div>
          <div class="section-title">Invoices</div>
          <div class="section-sub">Manage client billing and tracking</div>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="openInvoiceForm()">
            ${iconPlus()} New Invoice
          </button>
        </div>
      </div>

      <div class="table-card" style="margin-top:24px">
        <div class="table-header">
          <div class="table-title">All Invoices</div>
          <div class="table-actions">
            <select class="search-input" style="width:140px" onchange="loadInvoices({status:this.value})">
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partially_paid">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <input type="text" class="search-input" placeholder="Search..." oninput="searchInvoices(this.value)" style="width:240px" />
          </div>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead><tr>
              <th>Date</th><th>Invoice #</th><th>Client Name</th><th>Status</th>
              <th>Due Date</th><th>Amount</th><th>Balance</th><th>Actions</th>
            </tr></thead>
            <tbody id="finance-tbody"><tr><td colspan="8"><div class="empty-table"><p>Loading...</p></div></td></tr></tbody>
          </table>
        </div>
      </div>
    </div>`;

  await loadInvoices();
}

// Keep the internal methods
async function loadInvoices(params = {}) {
  const res = await api.invoices.list(params);
  if (!res.ok) return;
  invoicesData = res.data.data;
  renderInvoicesTable(invoicesData);
}

function renderInvoicesTable(invoices) {
  const tbody = document.getElementById('finance-tbody');
  if (!tbody) return;
  if (!invoices.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-table"><p>No transactions found.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = invoices.map(i => `<tr>
    <td style="color:var(--text-muted)">${formatDate(i.issueDate)}</td>
    <td class="td-mono" style="color:var(--accent); font-weight:700">${i.invoiceNumber}</td>
    <td><div style="font-weight:600">${i.clientName}</div></td>
    <td>${invoiceStatusBadge(i.status)}</td>
    <td style="color:${i.status==='overdue'?'var(--red)':'inherit'}">${formatDate(i.dueDate)}</td>
    <td class="td-mono" style="font-weight:600">${formatCurrency(i.grandTotal)}</td>
    <td class="td-mono" style="color:${i.balanceDue > 0 ? 'var(--red)' : 'var(--text-muted)'}">${formatCurrency(i.balanceDue)}</td>
    <td>
      <div style="display:flex; gap:6px">
        <button class="btn btn-ghost btn-icon btn-sm" onclick="viewInvoice('${i._id}')">${iconEye()}</button>
        ${i.status !== 'paid' ? `<button class="btn btn-ghost btn-icon btn-sm" style="color:var(--green)" onclick="openRecordPaymentForm('${i._id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></button>` : ''}
      </div>
    </td>
  </tr>`).join('');
}

function setFinanceView(view) {
  currentFinanceView = view;
  const area = document.getElementById('finance-tbody');
  document.getElementById('finance-table-title').textContent = view.charAt(0).toUpperCase() + view.slice(1);
  
  if (view === 'expenses') loadExpenses();
  else if (view === 'payments') loadPayments();
  else loadInvoices();
}

async function loadExpenses() {
  const res = await api.expenses.list();
  if (!res.ok) return;
  const tbody = document.getElementById('finance-tbody');
  tbody.innerHTML = res.data.data.map(ex => `<tr>
    <td style="color:var(--text-muted)">${formatDate(ex.date)}</td>
    <td class="td-mono" style="color:var(--accent)">${ex.expenseId}</td>
    <td><div style="font-weight:600">${ex.description}</div><div style="font-size:0.7rem; color:var(--text-muted)">${ex.vendor || ''}</div></td>
    <td><span class="badge badge-purple">${ex.category}</span></td>
    <td>—</td>
    <td class="td-mono" style="color:var(--red); font-weight:700">${formatCurrency(ex.amount)}</td>
    <td>—</td>
    <td><button class="btn btn-ghost btn-icon btn-sm" style="color:var(--red)" onclick="deleteExpenseConfirm('${ex._id}', '${ex.expenseId}')">${iconTrash()}</button></td>
  </tr>`).join('');
}

async function loadPayments() {
  const res = await api.payments.list();
  if (!res.ok) return;
  const tbody = document.getElementById('finance-tbody');
  tbody.innerHTML = res.data.data.map(p => `<tr>
    <td style="color:var(--text-muted)">${formatDate(p.paymentDate)}</td>
    <td class="td-mono" style="color:var(--accent)">${p.paymentId}</td>
    <td><div style="font-weight:600">${p.clientName}</div><div style="font-size:0.7rem; color:var(--text-muted)">INV: ${p.invoiceNumber}</div></td>
    <td><span class="badge badge-green">Received</span></td>
    <td>—</td>
    <td class="td-mono" style="color:var(--green); font-weight:700">${formatCurrency(p.amount)}</td>
    <td>—</td>
    <td><button class="btn btn-ghost btn-icon btn-sm">${iconEye()}</button></td>
  </tr>`).join('');
}

const invoiceStatusBadge = (s) => {
  const m = { draft:'badge-gray', sent:'badge-blue', paid:'badge-green', overdue:'badge-red', partially_paid:'badge-yellow', cancelled:'badge-gray' };
  return `<span class="badge ${m[s]||'badge-gray'}">${s.replace('_', ' ').toUpperCase()}</span>`;
};

// ... existing form handlers (openInvoiceForm, saveInvoice, etc.) preserved ...
// (I will append the missing functions in the final write)

function openInvoiceForm(inv = null) {
  const isEdit = !!inv;
  const html = `
    <form id="inv-form" onsubmit="saveInvoice(event, ${isEdit ? `'${inv._id}'` : 'null'})">
      <div class="form-grid">
        <div class="field full"><label>Customer Name *</label><input type="text" name="clientName" required value="${isEdit ? inv.clientName : ''}" /></div>
        <div class="field"><label>Invoice Date</label><input type="date" name="issueDate" value="${isEdit ? inv.issueDate.split('T')[0] : new Date().toISOString().split('T')[0]}" /></div>
        <div class="field"><label>Due Date *</label><input type="date" name="dueDate" required value="${isEdit ? inv.dueDate.split('T')[0] : ''}" /></div>
        <div class="field full"><label>Items</label>
          <textarea name="itemsJson" rows="5" placeholder='[{"description":"Development","quantity":1,"rate":50000,"taxPercent":18}]'>${isEdit ? JSON.stringify(inv.items, null, 2) : ''}</textarea>
        </div>
      </div>
      <div class="modal-footer" style="margin:20px -26px -26px; padding:15px 26px; background:var(--bg-body)">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Generate'} Invoice</button>
      </div>
    </form>`;
  openModal(isEdit ? 'Edit Invoice' : 'New Invoice', html);
}

async function saveInvoice(e, id) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try { data.items = JSON.parse(data.itemsJson || '[]'); } catch { return toast('Invalid items JSON', 'error'); }
  const res = id ? await api.invoices.update(id, data) : await api.invoices.create(data);
  if (res.ok) { closeModal(); toast('Invoice saved'); renderFinanceInvoices(document.getElementById('content-area')); }
}

async function viewInvoice(id) {
  const res = await api.invoices.get(id);
  if (!res.ok) return;
  const i = res.data.data;
  
  const itemsHtml = i.items.map(it => `
    <tr>
      <td>${it.description}</td>
      <td style="text-align:right">${it.quantity}</td>
      <td style="text-align:right">${formatCurrency(it.rate)}</td>
      <td style="text-align:right">${formatCurrency(it.amount)}</td>
    </tr>
  `).join('');

  const html = `
    <div class="invoice-view">
      <div style="display:flex; justify-content:space-between; margin-bottom:30px">
        <div><h1 style="margin:0; color:var(--text-primary)">INVOICE</h1><div class="td-mono">${i.invoiceNumber}</div></div>
        <div style="text-align:right">
          <div style="font-weight:700">ORAI Robotics</div>
          <div style="font-size:0.8rem; color:var(--text-muted)">GSTIN: 29AAAAA0000A1Z5</div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:30px">
        <div>
          <label style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase">Bill To</label>
          <div style="font-weight:700; font-size:1.1rem">${i.clientName}</div>
          <div style="color:var(--text-secondary)">${i.clientEmail || ''}</div>
        </div>
        <div style="text-align:right">
          <div style="margin-bottom:5px"><span>Invoice Date:</span> <span style="font-weight:600">${formatDate(i.issueDate)}</span></div>
          <div><span>Due Date:</span> <span style="font-weight:600; color:var(--red)">${formatDate(i.dueDate)}</span></div>
        </div>
      </div>

      <table class="invoice-table" style="width:100%; border-collapse:collapse; margin-bottom:20px">
        <thead style="background:var(--bg-body)">
          <tr><th style="text-align:left; padding:12px">Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div style="display:flex; justify-content:flex-end">
        <div style="width:250px">
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border)"><span>Subtotal</span><span>${formatCurrency(i.subtotal)}</span></div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border)"><span>Tax (GST)</span><span>${formatCurrency(i.taxTotal)}</span></div>
          <div style="display:flex; justify-content:space-between; padding:12px 0; font-weight:800; font-size:1.2rem; color:var(--accent)"><span>Total</span><span>${formatCurrency(i.grandTotal)}</span></div>
        </div>
      </div>

      <div style="margin-top:40px; display:flex; gap:10px; justify-content:flex-end">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" onclick="window.print()">Print Invoice</button>
      </div>
    </div>
  `;
  openModal('Invoice Detail', html);
}

function openRecordPaymentForm(invId) {
  const html = `
    <form onsubmit="savePayment(event, '${invId}')">
      <div class="form-grid">
        <div class="field"><label>Amount Paid *</label><input type="number" name="amount" required /></div>
        <div class="field"><label>Payment Mode</label><select name="paymentMethod"><option value="bank_transfer">Bank Transfer</option><option value="upi">UPI</option><option value="cash">Cash</option></select></div>
        <div class="field full"><label>Reference #</label><input type="text" name="transactionId" placeholder="TXN-XXXX" /></div>
      </div>
      <div class="modal-footer" style="margin:20px -26px -26px; padding:15px 26px; background:var(--bg-body)">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Record Payment</button>
      </div>
    </form>`;
  openModal('Record Payment', html);
}

async function savePayment(e, invId) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.invoiceId = invId;
  const res = await api.payments.create(data);
  if (res.ok) { closeModal(); toast('Payment recorded'); renderFinanceSales(document.getElementById('content-area')); }
}

function deleteExpenseConfirm(id, name) {
  confirmDelete(`Expense ${name}`, async () => {
    await api.expenses.delete(id);
    toast('Deleted');
    renderFinanceHome(document.getElementById('content-area'));
  });
}

console.log('[FINANCE MODULE UPGRADED]');
