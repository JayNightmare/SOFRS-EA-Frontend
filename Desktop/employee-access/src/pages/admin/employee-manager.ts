import {
    ApiError,
    EmployeeCreate,
    EmployeeRead,
    EmployeeUpdate,
    createEmployee,
    deleteEmployee,
    getEmployeeById,
    listEmployees,
    updateEmployee,
} from '../../api';
import { View } from '../../renderer';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const EMPLOYEE_ID_PATTERN = /^EA[A-Za-z0-9]{6}$/;

const formatDateForInput = (value?: string): string => {
    if (!value) {
        return '';
    }
    return value.slice(0, 10);
};

const toApiErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof ApiError) {
        return error.detail ? `${error.message}: ${error.detail}` : error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return fallback;
};

type EmployeePayloadResult = {
    fullName: string;
    payload: EmployeeCreate | EmployeeUpdate;
};

const buildPayloadFromForm = (form: HTMLFormElement, prefix: string): EmployeePayloadResult => {
    const fullName = (form.querySelector(`#${prefix}-fullName`) as HTMLInputElement).value.trim();
    const gender = (form.querySelector(`#${prefix}-gender`) as HTMLSelectElement).value.trim();
    const dob = (form.querySelector(`#${prefix}-dob`) as HTMLInputElement).value.trim();
    const email = (form.querySelector(`#${prefix}-email`) as HTMLInputElement).value.trim();
    const phone = (form.querySelector(`#${prefix}-phone`) as HTMLInputElement).value.trim();

    const payload: EmployeeCreate | EmployeeUpdate = {};

    if (fullName) {
        payload.fullName = fullName;
    }
    if (gender) {
        payload.gender = gender;
    }
    if (dob) {
        payload.DoB = dob;
    }
    if (email) {
        payload.email = email;
    }
    if (phone) {
        payload.Phone = phone;
    }

    return { fullName, payload };
};

export const createEmployeeManager = (): View => {
    const container = document.createElement('div');
    container.className = 'crud-manager';

    const header = document.createElement('div');
    header.className = 'crud-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'crud-title-wrap';

    const title = document.createElement('h2');
    title.textContent = 'Employee Management';

    const subtitle = document.createElement('p');
    subtitle.className = 'crud-subtitle';
    subtitle.textContent =
        'New User creates a database record. Existing User looks up an Employee ID and opens management mode.';

    titleWrap.append(title, subtitle);

    const btnCreate = document.createElement('button');
    btnCreate.className = 'crud-btn primary';
    btnCreate.textContent = '+ Add Employee';

    header.append(titleWrap, btnCreate);

    const tableContainer = document.createElement('div');
    tableContainer.className = 'crud-table-container';

    const table = document.createElement('table');
    table.className = 'crud-table';
    table.innerHTML = `
    <thead>
      <tr>
        <th>ID</th>
        <th>Full Name</th>
        <th>Gender</th>
        <th>DoB</th>
        <th>Email</th>
        <th>Phone</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="emp-tbody">
      <tr><td colspan="7">Loading...</td></tr>
    </tbody>
  `;
    tableContainer.append(table);

    container.append(header, tableContainer);

    let employees: EmployeeRead[] = [];

    const showManageForm = (employee: EmployeeRead): void => {
        const overlay = document.createElement('div');
        overlay.className = 'crud-overlay';

        const modal = document.createElement('div');
        modal.className = 'crud-modal';

        modal.innerHTML = `
      <h3>Manage Employee</h3>
      <form id="emp-manage-form">
        <div class="form-group">
          <label>Employee ID</label>
          <input type="text" id="manage-emp-id" value="${employee.id}" readonly />
        </div>
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="manage-emp-fullName" value="${employee.fullName}" required />
        </div>
        <div class="form-group">
          <label>Gender (optional)</label>
          <select id="manage-emp-gender" class="register-select">
            <option value="">Prefer not to say</option>
            <option value="male" ${employee.gender === 'male' ? 'selected' : ''}>Male</option>
            <option value="female" ${employee.gender === 'female' ? 'selected' : ''}>Female</option>
            <option value="other" ${employee.gender === 'other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Date of Birth (optional)</label>
          <input type="date" id="manage-emp-dob" value="${formatDateForInput(employee.DoB)}" />
        </div>
        <div class="form-group">
          <label>Email (optional)</label>
          <input type="email" id="manage-emp-email" value="${employee.email || ''}" />
        </div>
        <div class="form-group">
          <label>Phone (optional)</label>
          <input type="tel" id="manage-emp-phone" value="${employee.Phone || ''}" />
        </div>
        <p class="crud-inline-status" id="manage-emp-status"></p>
        <div class="crud-btn-group">
          <button type="button" class="crud-btn cancel-btn">Close</button>
          <button type="submit" class="crud-btn primary submit-btn">Save Changes</button>
        </div>
      </form>
    `;

        overlay.append(modal);
        document.body.appendChild(overlay);

        modal.querySelector('.cancel-btn')?.addEventListener('click', () => {
            overlay.remove();
        });

        modal.querySelector('#emp-manage-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.currentTarget as HTMLFormElement;
            const status = form.querySelector('#manage-emp-status') as HTMLParagraphElement;
            const submitButton = form.querySelector('.submit-btn') as HTMLButtonElement;

            const { fullName, payload } = buildPayloadFromForm(form, 'manage-emp');
            if (!fullName) {
                status.textContent = 'Full name is required.';
                return;
            }

            submitButton.disabled = true;
            status.textContent = 'Saving employee changes...';

            try {
                await updateEmployee(employee.id, payload);
                overlay.remove();
                await loadData();
            } catch (error) {
                status.textContent = toApiErrorMessage(error, 'Failed to save employee.');
            } finally {
                submitButton.disabled = false;
            }
        });
    };

    const showAddFlowModal = (): void => {
        const overlay = document.createElement('div');
        overlay.className = 'crud-overlay';

        const modal = document.createElement('div');
        modal.className = 'crud-modal';

        modal.innerHTML = `
      <h3>Add Employee</h3>
      <p class="crud-mode-copy">Choose whether you are creating a new record or loading an existing employee by ID.</p>
      <div class="crud-mode-toggle">
        <button type="button" class="crud-mode-btn active" data-mode="new">New User</button>
        <button type="button" class="crud-mode-btn" data-mode="existing">Existing User</button>
      </div>
      <section class="crud-mode-panel" data-panel="new">
        <form id="emp-create-form">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="new-emp-fullName" required />
          </div>
          <div class="form-group">
            <label>Gender</label>
            <select id="new-emp-gender" class="register-select" required>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Date of Birth</label>
            <input type="date" id="new-emp-dob" required />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="new-emp-email" required />
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="tel" id="new-emp-phone" required />
          </div>
          <div class="crud-btn-group">
            <button type="button" class="crud-btn cancel-btn" data-close>Add Later</button>
            <button type="submit" class="crud-btn primary">Create User</button>
          </div>
        </form>
      </section>
      <section class="crud-mode-panel" data-panel="existing" hidden>
        <form id="emp-existing-form">
          <div class="form-group">
            <label>Employee ID</label>
            <input type="text" id="existing-emp-id" placeholder="EA123456" autocomplete="off" required />
          </div>
          <div class="crud-btn-group">
            <button type="button" class="crud-btn cancel-btn" data-close>Cancel</button>
            <button type="submit" class="crud-btn primary">Find Employee</button>
          </div>
        </form>
      </section>
      <p class="crud-inline-status" id="emp-create-status"></p>
    `;

        overlay.append(modal);
        document.body.appendChild(overlay);

        const status = modal.querySelector('#emp-create-status') as HTMLParagraphElement;
        const newPanel = modal.querySelector('[data-panel="new"]') as HTMLElement;
        const existingPanel = modal.querySelector('[data-panel="existing"]') as HTMLElement;
        const modeButtons = Array.from(modal.querySelectorAll('.crud-mode-btn')) as HTMLButtonElement[];

        const setMode = (mode: 'new' | 'existing') => {
            modeButtons.forEach((button) => {
                button.classList.toggle('active', button.dataset.mode === mode);
            });
            newPanel.hidden = mode !== 'new';
            existingPanel.hidden = mode !== 'existing';
            status.textContent = '';
        };

        modeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const mode = button.dataset.mode === 'existing' ? 'existing' : 'new';
                setMode(mode);
            });
        });

        modal.querySelectorAll('[data-close]').forEach((button) => {
            button.addEventListener('click', () => {
                overlay.remove();
            });
        });

        modal.querySelector('#emp-create-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.currentTarget as HTMLFormElement;
            const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;

            const { fullName, payload } = buildPayloadFromForm(form, 'EA');
            if (!fullName || !payload.gender || !payload.DoB || !payload.email || !payload.Phone) {
                status.textContent = 'New User requires full name, gender, date of birth, email, and phone.';
                return;
            }

            submitButton.disabled = true;
            status.textContent = 'Creating employee record...';

            try {
                await createEmployee(payload as EmployeeCreate);
                overlay.remove();
                await loadData();
            } catch (error) {
                status.textContent = toApiErrorMessage(error, 'Failed to create employee.');
            } finally {
                submitButton.disabled = false;
            }
        });

        modal.querySelector('#emp-existing-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.currentTarget as HTMLFormElement;
            const input = form.querySelector('#existing-emp-id') as HTMLInputElement;
            const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
            const id = input.value.trim().toUpperCase();

            if (!EMPLOYEE_ID_PATTERN.test(id)) {
                status.textContent = 'Employee ID must use EA followed by 6 letters or numbers.';
                return;
            }

            submitButton.disabled = true;
            status.textContent = `Searching ${id}...`;

            try {
                const employee = await getEmployeeById(id);
                overlay.remove();
                showManageForm(employee);
            } catch (error) {
                status.textContent = toApiErrorMessage(error, 'Employee not found.');
            } finally {
                submitButton.disabled = false;
            }
        });
    };

    const loadData = async () => {
        const tbody = container.querySelector('#emp-tbody');
        if (!tbody) {
            return;
        }

        tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

        try {
            employees = await listEmployees();
            tbody.innerHTML = '';

            if (employees.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7">No employees found. Add one using + Add Employee.</td></tr>';
                return;
            }

            employees.forEach((employee) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
          <td>${employee.id}</td>
          <td>${employee.fullName}</td>
          <td>${employee.gender || '-'}</td>
          <td>${employee.DoB || '-'}</td>
          <td>${employee.email || '-'}</td>
          <td>${employee.Phone || '-'}</td>
          <td class="crud-actions">
            <button class="icon-btn edit-btn" data-id="${employee.id}">✎</button>
            <button class="icon-btn del-btn" data-id="${employee.id}">🗑</button>
          </td>
        `;
                tbody.append(tr);
            });

            tbody.querySelectorAll('.del-btn').forEach((btn) => {
                btn.addEventListener('click', async (event) => {
                    const id = (event.currentTarget as HTMLButtonElement).dataset.id;
                    if (!id) {
                        return;
                    }

                    if (!window.confirm(`Delete employee ${id}?`)) {
                        return;
                    }

                    try {
                        await deleteEmployee(id);
                        await loadData();
                    } catch (error) {
                        window.alert(toApiErrorMessage(error, 'Failed to delete employee.'));
                    }
                });
            });

            tbody.querySelectorAll('.edit-btn').forEach((btn) => {
                btn.addEventListener('click', (event) => {
                    const id = (event.currentTarget as HTMLButtonElement).dataset.id;
                    if (!id) {
                        return;
                    }
                    const employee = employees.find((entry) => entry.id === id);
                    if (employee) {
                        showManageForm(employee);
                    }
                });
            });
        } catch (error) {
            console.error('Failed to load employees', error);
            const message =
                error instanceof ApiError && error.status === 404
                    ? `Employee list endpoint was not found. Verify API base URL (${API_BASE_URL}) and backend route availability.`
                    : toApiErrorMessage(error, 'Error loading employees. Is the backend running?');
            tbody.innerHTML = `<tr><td colspan="7">${message}</td></tr>`;
        }
    };

    btnCreate.addEventListener('click', () => {
        showAddFlowModal();
    });

    return {
        element: container,
        onShow: () => {
            void loadData();
        },
    };
};
