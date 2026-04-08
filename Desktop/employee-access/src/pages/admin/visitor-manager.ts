import {
    ApiError,
    VisitorCreate,
    VisitorRead,
    VisitorUpdate,
    createVisitor,
    deleteVisitor,
    getVisitorById,
    listVisitors,
    updateVisitor,
} from '../../api';
import { View } from '../../renderer';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const VISITOR_ID_PATTERN = /^VA[A-Za-z0-9]{6}$/;

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

type VisitorPayloadResult = {
    fullName: string;
    payload: VisitorCreate | VisitorUpdate;
};

const buildPayloadFromForm = (form: HTMLFormElement, prefix: string): VisitorPayloadResult => {
    const fullName = (form.querySelector(`#${prefix}-fullName`) as HTMLInputElement).value.trim();
    const gender = (form.querySelector(`#${prefix}-gender`) as HTMLSelectElement).value.trim();
    const dob = (form.querySelector(`#${prefix}-dob`) as HTMLInputElement).value.trim();
    const email = (form.querySelector(`#${prefix}-email`) as HTMLInputElement).value.trim();
    const phone = (form.querySelector(`#${prefix}-phone`) as HTMLInputElement).value.trim();

    const payload: VisitorCreate | VisitorUpdate = {};

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

export const createVisitorManager = (): View => {
    const container = document.createElement('div');
    container.className = 'crud-manager';

    const header = document.createElement('div');
    header.className = 'crud-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'crud-title-wrap';

    const title = document.createElement('h2');
    title.textContent = 'Visitor Management';

    const subtitle = document.createElement('p');
    subtitle.className = 'crud-subtitle';
    subtitle.textContent =
        'New User creates a database record. Existing User looks up a Visitor ID and opens management mode.';

    titleWrap.append(title, subtitle);

    const btnCreate = document.createElement('button');
    btnCreate.className = 'crud-btn primary';
    btnCreate.textContent = '+ Add Visitor';

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
    <tbody id="vis-tbody">
      <tr><td colspan="7">Loading...</td></tr>
    </tbody>
  `;

    tableContainer.append(table);
    container.append(header, tableContainer);

    let visitors: VisitorRead[] = [];

    const showManageForm = (visitor: VisitorRead): void => {
        const overlay = document.createElement('div');
        overlay.className = 'crud-overlay';

        const modal = document.createElement('div');
        modal.className = 'crud-modal';

        modal.innerHTML = `
      <h3>Manage Visitor</h3>
      <form id="vis-manage-form">
        <div class="form-group">
          <label>Visitor ID</label>
          <input type="text" id="manage-vis-id" value="${visitor.id}" readonly />
        </div>
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="manage-vis-fullName" value="${visitor.fullName}" required />
        </div>
        <div class="form-group">
          <label>Gender (optional)</label>
          <select id="manage-vis-gender" class="register-select">
            <option value="">Prefer not to say</option>
            <option value="male" ${visitor.gender === 'male' ? 'selected' : ''}>Male</option>
            <option value="female" ${visitor.gender === 'female' ? 'selected' : ''}>Female</option>
            <option value="other" ${visitor.gender === 'other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Date of Birth (optional)</label>
          <input type="date" id="manage-vis-dob" value="${formatDateForInput(visitor.DoB)}" />
        </div>
        <div class="form-group">
          <label>Email (optional)</label>
          <input type="email" id="manage-vis-email" value="${visitor.email || ''}" />
        </div>
        <div class="form-group">
          <label>Phone (optional)</label>
          <input type="tel" id="manage-vis-phone" value="${visitor.Phone || ''}" />
        </div>
        <p class="crud-inline-status" id="manage-vis-status"></p>
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

        modal.querySelector('#vis-manage-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.currentTarget as HTMLFormElement;
            const status = form.querySelector('#manage-vis-status') as HTMLParagraphElement;
            const submitButton = form.querySelector('.submit-btn') as HTMLButtonElement;

            const { fullName, payload } = buildPayloadFromForm(form, 'manage-vis');
            if (!fullName) {
                status.textContent = 'Full name is required.';
                return;
            }

            submitButton.disabled = true;
            status.textContent = 'Saving visitor changes...';

            try {
                await updateVisitor(visitor.id, payload);
                overlay.remove();
                await loadData();
            } catch (error) {
                status.textContent = toApiErrorMessage(error, 'Failed to save visitor.');
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
      <h3>Add Visitor</h3>
      <p class="crud-mode-copy">Choose whether you are creating a new record or loading an existing visitor by ID.</p>
      <div class="crud-mode-toggle">
        <button type="button" class="crud-mode-btn active" data-mode="new">New User</button>
        <button type="button" class="crud-mode-btn" data-mode="existing">Existing User</button>
      </div>
      <section class="crud-mode-panel" data-panel="new">
        <form id="vis-create-form">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="new-vis-fullName" required />
          </div>
          <div class="form-group">
            <label>Gender</label>
            <select id="new-vis-gender" class="register-select" required>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Date of Birth</label>
            <input type="date" id="new-vis-dob" required />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="new-vis-email" required />
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="tel" id="new-vis-phone" required />
          </div>
          <div class="crud-btn-group">
            <button type="button" class="crud-btn cancel-btn" data-close>Add Later</button>
            <button type="submit" class="crud-btn primary">Create User</button>
          </div>
        </form>
      </section>
      <section class="crud-mode-panel" data-panel="existing" hidden>
        <form id="vis-existing-form">
          <div class="form-group">
            <label>Visitor ID</label>
            <input type="text" id="existing-vis-id" placeholder="VA123456" autocomplete="off" required />
          </div>
          <div class="crud-btn-group">
            <button type="button" class="crud-btn cancel-btn" data-close>Cancel</button>
            <button type="submit" class="crud-btn primary">Find Visitor</button>
          </div>
        </form>
      </section>
      <p class="crud-inline-status" id="vis-create-status"></p>
    `;

        overlay.append(modal);
        document.body.appendChild(overlay);

        const status = modal.querySelector('#vis-create-status') as HTMLParagraphElement;
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

        modal.querySelector('#vis-create-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.currentTarget as HTMLFormElement;
            const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;

            const { fullName, payload } = buildPayloadFromForm(form, 'new-vis');
            if (!fullName || !payload.gender || !payload.DoB || !payload.email || !payload.Phone) {
                status.textContent = 'New User requires full name, gender, date of birth, email, and phone.';
                return;
            }

            submitButton.disabled = true;
            status.textContent = 'Creating visitor record...';

            try {
                await createVisitor(payload as VisitorCreate);
                overlay.remove();
                await loadData();
            } catch (error) {
                status.textContent = toApiErrorMessage(error, 'Failed to create visitor.');
            } finally {
                submitButton.disabled = false;
            }
        });

        modal.querySelector('#vis-existing-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.currentTarget as HTMLFormElement;
            const input = form.querySelector('#existing-vis-id') as HTMLInputElement;
            const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
            const id = input.value.trim().toUpperCase();

            if (!VISITOR_ID_PATTERN.test(id)) {
                status.textContent = 'Visitor ID must use VA followed by 6 letters or numbers.';
                return;
            }

            submitButton.disabled = true;
            status.textContent = `Searching ${id}...`;

            try {
                const visitor = await getVisitorById(id);
                overlay.remove();
                showManageForm(visitor);
            } catch (error) {
                status.textContent = toApiErrorMessage(error, 'Visitor not found.');
            } finally {
                submitButton.disabled = false;
            }
        });
    };

    const loadData = async () => {
        const tbody = container.querySelector('#vis-tbody');
        if (!tbody) {
            return;
        }

        tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

        try {
            visitors = await listVisitors();
            tbody.innerHTML = '';

            if (visitors.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7">No visitors found. Add one using + Add Visitor.</td></tr>';
                return;
            }

            visitors.forEach((visitor) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
          <td>${visitor.id}</td>
          <td>${visitor.fullName}</td>
          <td>${visitor.gender || '-'}</td>
          <td>${visitor.DoB || '-'}</td>
          <td>${visitor.email || '-'}</td>
          <td>${visitor.Phone || '-'}</td>
          <td class="crud-actions">
            <button class="icon-btn edit-btn" data-id="${visitor.id}">✎</button>
            <button class="icon-btn del-btn" data-id="${visitor.id}">🗑</button>
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

                    if (!window.confirm(`Delete visitor ${id}?`)) {
                        return;
                    }

                    try {
                        await deleteVisitor(id);
                        await loadData();
                    } catch (error) {
                        window.alert(toApiErrorMessage(error, 'Failed to delete visitor.'));
                    }
                });
            });

            tbody.querySelectorAll('.edit-btn').forEach((btn) => {
                btn.addEventListener('click', (event) => {
                    const id = (event.currentTarget as HTMLButtonElement).dataset.id;
                    if (!id) {
                        return;
                    }
                    const visitor = visitors.find((entry) => entry.id === id);
                    if (visitor) {
                        showManageForm(visitor);
                    }
                });
            });
        } catch (error) {
            console.error('Failed to load visitors', error);
            const message =
                error instanceof ApiError && error.status === 404
                    ? `Visitor list endpoint was not found. Verify API base URL (${API_BASE_URL}) and backend route availability.`
                    : toApiErrorMessage(error, 'Error loading visitors. Is the backend running?');
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
