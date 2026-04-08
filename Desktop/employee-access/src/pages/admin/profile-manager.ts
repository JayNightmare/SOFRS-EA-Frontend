import {
    ApiError,
    EmployeeRead,
    VisitorRead,
    getEmployeeById,
    getVisitorById,
} from '../../api';
import { View } from '../../renderer';

type ProfileKind = 'employee' | 'visitor';

type ProfileRecord = EmployeeRead | VisitorRead;

const EMPLOYEE_ID_PATTERN = /^EA[A-Za-z0-9]{6}$/;
const VISITOR_ID_PATTERN = /^VA[A-Za-z0-9]{6}$/;

const toApiErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof ApiError) {
        return error.detail ? `${error.message}: ${error.detail}` : error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return fallback;
};

const createProfileRow = (label: string, value: string): HTMLElement => {
    const row = document.createElement('div');
    row.className = 'profile-row';

    const key = document.createElement('span');
    key.className = 'profile-key';
    key.textContent = label;

    const text = document.createElement('span');
    text.className = 'profile-value';
    text.textContent = value;

    row.append(key, text);
    return row;
};

const createResultCard = (kind: ProfileKind, profile: ProfileRecord): HTMLElement => {
    const card = document.createElement('article');
    card.className = 'profile-result-card';

    const title = document.createElement('h3');
    title.textContent = kind === 'employee' ? 'Employee Profile' : 'Visitor Profile';

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Current information loaded from the database.';

    const rows = document.createElement('div');
    rows.className = 'profile-rows';
    rows.append(
        createProfileRow('ID', profile.id),
        createProfileRow('Full Name', profile.fullName),
        createProfileRow('Gender', profile.gender || '-'),
        createProfileRow('Date of Birth', profile.DoB || '-'),
        createProfileRow('Email', profile.email || '-'),
        createProfileRow('Phone', profile.Phone || '-'),
    );

    card.append(title, subtitle, rows);
    return card;
};

export const createProfileManager = (): View => {
    const container = document.createElement('section');
    container.className = 'profile-view';

    const header = document.createElement('header');
    header.className = 'profile-heading';
    header.innerHTML = `
    <h2>Profile Lookup</h2>
    <p>Search existing employees or visitors by ID to view their current profile details.</p>
  `;

    const panel = document.createElement('article');
    panel.className = 'profile-panel';

    const modeLabel = document.createElement('p');
    modeLabel.className = 'profile-label';
    modeLabel.textContent = 'Record Type';

    const modeToggle = document.createElement('div');
    modeToggle.className = 'profile-kind-toggle';

    const employeeButton = document.createElement('button');
    employeeButton.type = 'button';
    employeeButton.className = 'profile-kind-btn active';
    employeeButton.textContent = 'Employee';

    const visitorButton = document.createElement('button');
    visitorButton.type = 'button';
    visitorButton.className = 'profile-kind-btn';
    visitorButton.textContent = 'Visitor';

    modeToggle.append(employeeButton, visitorButton);

    const form = document.createElement('form');
    form.className = 'profile-form';

    const inputLabel = document.createElement('label');
    inputLabel.className = 'profile-label';
    inputLabel.textContent = 'Record ID';

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.className = 'profile-id-input';
    idInput.placeholder = 'EA123456';
    idInput.autocomplete = 'off';
    idInput.required = true;

    inputLabel.append(idInput);

    const buttonRow = document.createElement('div');
    buttonRow.className = 'profile-actions';

    const searchButton = document.createElement('button');
    searchButton.type = 'submit';
    searchButton.className = 'crud-btn primary';
    searchButton.textContent = 'Search Profile';

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'crud-btn cancel-btn';
    clearButton.textContent = 'Clear';

    buttonRow.append(searchButton, clearButton);

    const status = document.createElement('p');
    status.className = 'profile-status';
    status.textContent = 'Enter an ID to load profile information.';

    const result = document.createElement('div');
    result.className = 'profile-result';

    form.append(inputLabel, buttonRow, status);
    panel.append(modeLabel, modeToggle, form, result);
    container.append(header, panel);

    let kind: ProfileKind = 'employee';
    let loading = false;

    const setKind = (next: ProfileKind) => {
        kind = next;
        employeeButton.classList.toggle('active', kind === 'employee');
        visitorButton.classList.toggle('active', kind === 'visitor');
        idInput.placeholder = kind === 'employee' ? 'EA123456' : 'VA123456';
        idInput.value = '';
        status.textContent =
            kind === 'employee'
                ? 'Enter an Employee ID (EA + 6 characters).'
                : 'Enter a Visitor ID (VA + 6 characters).';
        result.replaceChildren();
    };

    employeeButton.addEventListener('click', () => {
        if (loading) {
            return;
        }
        setKind('employee');
    });

    visitorButton.addEventListener('click', () => {
        if (loading) {
            return;
        }
        setKind('visitor');
    });

    clearButton.addEventListener('click', () => {
        if (loading) {
            return;
        }
        idInput.value = '';
        status.textContent = 'Enter an ID to load profile information.';
        result.replaceChildren();
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (loading) {
            return;
        }

        const id = idInput.value.trim().toUpperCase();
        const pattern = kind === 'employee' ? EMPLOYEE_ID_PATTERN : VISITOR_ID_PATTERN;
        if (!pattern.test(id)) {
            status.textContent =
                kind === 'employee'
                    ? 'Employee ID format must be EA followed by 6 letters or numbers.'
                    : 'Visitor ID format must be VA followed by 6 letters or numbers.';
            result.replaceChildren();
            return;
        }

        loading = true;
        searchButton.disabled = true;
        status.textContent = 'Loading profile...';

        try {
            const profile = kind === 'employee' ? await getEmployeeById(id) : await getVisitorById(id);
            status.textContent = 'Profile loaded successfully.';
            result.replaceChildren(createResultCard(kind, profile));
        } catch (error) {
            result.replaceChildren();
            status.textContent = toApiErrorMessage(error, 'Unable to load profile.');
        } finally {
            loading = false;
            searchButton.disabled = false;
        }
    });

    return {
        element: container,
    };
};
