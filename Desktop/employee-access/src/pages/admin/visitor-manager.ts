import { View } from '../../renderer';

export type Visitor = {
  id: string; // "VS-XXXXXX"
  name: string;
  purpose: string;
  host_employee: string;
  expires_at: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const createVisitorManager = (): View => {
  const container = document.createElement('div');
  container.className = 'crud-manager';

  const header = document.createElement('div');
  header.className = 'crud-header';

  const title = document.createElement('h2');
  title.textContent = 'Visitor Management';

  const btnCreate = document.createElement('button');
  btnCreate.className = 'crud-btn primary';
  btnCreate.textContent = '+ Add Visitor';

  header.append(title, btnCreate);

  const tableContainer = document.createElement('div');
  tableContainer.className = 'crud-table-container';

  const table = document.createElement('table');
  table.className = 'crud-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Purpose</th>
        <th>Hostname (ID)</th>
        <th>Expires At</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="vis-tbody">
      <tr><td colspan="6">Loading...</td></tr>
    </tbody>
  `;
  tableContainer.append(table);
  container.append(header, tableContainer);

  const loadData = async () => {
    try {
      const resp = await fetch(`${API_BASE}/visitor/`);
      const data: Visitor[] = await resp.json();

      const tbody = container.querySelector('#vis-tbody');
      if (!tbody) return;

      tbody.innerHTML = '';
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No visitors found.</td></tr>';
        return;
      }

      data.forEach((vis) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${vis.id}</td>
          <td>${vis.name}</td>
          <td>${vis.purpose || '-'}</td>
          <td>${vis.host_employee || '-'}</td>
          <td>${vis.expires_at ? new Date(vis.expires_at).toLocaleString() : '-'}</td>
          <td class="crud-actions">
            <button class="icon-btn edit-btn" data-id="${vis.id}">✎</button>
            <button class="icon-btn del-btn" data-id="${vis.id}">🗑</button>
          </td>
        `;
        tbody.append(tr);
      });

      // Bind actions
      tbody.querySelectorAll('.del-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = (e.currentTarget as HTMLButtonElement).dataset.id;
          if (confirm(`Delete visitor ${id}?`)) {
            await fetch(`${API_BASE}/visitor/${id}`, { method: 'DELETE' });
            void loadData();
          }
        });
      });

      tbody.querySelectorAll('.edit-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const id = (e.currentTarget as HTMLButtonElement).dataset.id;
          const vis = data.find(d => d.id === id);
          if (vis) showForm(vis);
        });
      });
    } catch (err) {
      console.error('Failed to load visitors', err);
      const tbody = container.querySelector('#vis-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6">Error loading data. Is the backend running?</td></tr>';
    }
  };

  const showForm = (vis?: Visitor) => {
    const isEdit = !!vis;
    const overlay = document.createElement('div');
    overlay.className = 'crud-overlay';

    const modal = document.createElement('div');
    modal.className = 'crud-modal';

    const formatDateTimeLocal = (isoString?: string) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      // Remove the seconds and Z part from iso string for input type="datetime-local"
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };

    modal.innerHTML = `
      <h3>${isEdit ? 'Edit' : 'Add'} Visitor</h3>
      <form id="vis-form">
        <div class="form-group">
          <label>Visitor ID</label>
          <input type="text" id="vis-id" name="id" value="${vis?.id || ''}" ${isEdit ? 'readonly' : 'required'} placeholder="VS-XXXXXX" />
        </div>
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="vis-name" name="name" value="${vis?.name || ''}" required />
        </div>
        <div class="form-group">
          <label>Purpose of Visit</label>
          <input type="text" id="vis-purpose" name="purpose" value="${vis?.purpose || ''}" required />
        </div>
        <div class="form-group">
          <label>Host Employee ID</label>
          <input type="text" id="vis-host" name="host" value="${vis?.host_employee || ''}" placeholder="EA-XXXXXX" required />
        </div>
        <div class="form-group">
          <label>Expires At</label>
          <input type="datetime-local" id="vis-expiry" name="expires_at" value="${formatDateTimeLocal(vis?.expires_at)}" required />
        </div>
        <div class="crud-btn-group">
          <button type="button" class="crud-btn cancel-btn">Cancel</button>
          <button type="submit" class="crud-btn primary submit-btn">Save</button>
        </div>
      </form>
    `;

    overlay.append(modal);
    document.body.appendChild(overlay);

    modal.querySelector('.cancel-btn')?.addEventListener('click', () => {
      overlay.remove();
    });

    modal.querySelector('#vis-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;

      const payload = {
        id: (form.querySelector('#vis-id') as HTMLInputElement).value,
        name: (form.querySelector('#vis-name') as HTMLInputElement).value,
        purpose: (form.querySelector('#vis-purpose') as HTMLInputElement).value,
        host_employee: (form.querySelector('#vis-host') as HTMLInputElement).value,
        expires_at: new Date((form.querySelector('#vis-expiry') as HTMLInputElement).value).toISOString(),
      };

      try {
        if (isEdit) {
          await fetch(`${API_BASE}/visitor/${payload.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          await fetch(`${API_BASE}/visitor/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
        overlay.remove();
        void loadData();
      } catch (err) {
        alert('Failed to save. Check backend console.');
      }
    });
  };

  btnCreate.addEventListener('click', () => showForm());

  return {
    element: container,
    onShow: () => {
      void loadData();
    }
  };
};
