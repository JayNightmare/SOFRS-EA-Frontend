import { View } from '../../renderer';

export type Employee = {
  id: string; // "EA-XXXXXX"
  name: string;
  department: string;
  title: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const createEmployeeManager = (): View => {
  const container = document.createElement('div');
  container.className = 'crud-manager';

  const header = document.createElement('div');
  header.className = 'crud-header';

  const title = document.createElement('h2');
  title.textContent = 'Employee Management';

  const btnCreate = document.createElement('button');
  btnCreate.className = 'crud-btn primary';
  btnCreate.textContent = '+ Add Employee';

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
        <th>Department</th>
        <th>Title</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="emp-tbody">
      <tr><td colspan="5">Loading...</td></tr>
    </tbody>
  `;
  tableContainer.append(table);

  container.append(header, tableContainer);

  const loadData = async () => {
    try {
      const resp = await fetch(`${API_BASE}/employee/`);
      const data: Employee[] = await resp.json();

      const tbody = container.querySelector('#emp-tbody');
      if (!tbody) return;

      tbody.innerHTML = '';
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No employees found.</td></tr>';
        return;
      }

      data.forEach((emp) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${emp.id}</td>
          <td>${emp.name}</td>
          <td>${emp.department || '-'}</td>
          <td>${emp.title || '-'}</td>
          <td class="crud-actions">
            <button class="icon-btn edit-btn" data-id="${emp.id}">✎</button>
            <button class="icon-btn del-btn" data-id="${emp.id}">🗑</button>
          </td>
        `;
        tbody.append(tr);
      });

      // Bind actions
      tbody.querySelectorAll('.del-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = (e.currentTarget as HTMLButtonElement).dataset.id;
          if (confirm(`Delete employee ${id}?`)) {
            await fetch(`${API_BASE}/employee/${id}`, { method: 'DELETE' });
            void loadData();
          }
        });
      });

      tbody.querySelectorAll('.edit-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const id = (e.currentTarget as HTMLButtonElement).dataset.id;
          const emp = data.find(d => d.id === id);
          if (emp) showForm(emp);
        });
      });
    } catch (err) {
      console.error('Failed to load employees', err);
      const tbody = container.querySelector('#emp-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="5">Error loading data. Is the backend running?</td></tr>';
    }
  };

  const showForm = (emp?: Employee) => {
    const isEdit = !!emp;

    const overlay = document.createElement('div');
    overlay.className = 'crud-overlay';

    const modal = document.createElement('div');
    modal.className = 'crud-modal';

    modal.innerHTML = `
      <h3>${isEdit ? 'Edit' : 'Add'} Employee</h3>
      <form id="emp-form">
        <div class="form-group">
          <label>Employee ID</label>
          <input type="text" id="emp-id" name="id" value="${emp?.id || ''}" ${isEdit ? 'readonly' : 'required'} placeholder="EA-XXXXXX" />
        </div>
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="emp-name" name="name" value="${emp?.name || ''}" required />
        </div>
        <div class="form-group">
          <label>Department</label>
          <input type="text" id="emp-dep" name="department" value="${emp?.department || ''}" />
        </div>
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="emp-title" name="title" value="${emp?.title || ''}" />
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

    modal.querySelector('#emp-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;

      const payload = {
        id: (form.querySelector('#emp-id') as HTMLInputElement).value,
        name: (form.querySelector('#emp-name') as HTMLInputElement).value,
        department: (form.querySelector('#emp-dep') as HTMLInputElement).value,
        title: (form.querySelector('#emp-title') as HTMLInputElement).value,
      };

      try {
        if (isEdit) {
          await fetch(`${API_BASE}/employee/${payload.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          await fetch(`${API_BASE}/employee/`, {
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
