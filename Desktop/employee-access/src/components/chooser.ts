export type ChoiceHandlers = {
    onEmployee: () => void;
    onVisitor: () => void;
};

export const createChooser = ({ onEmployee, onVisitor }: ChoiceHandlers): HTMLElement => {
    const row = document.createElement('div');
    row.className = 'button-row';

    const employeeButton = document.createElement('button');
    employeeButton.className = 'action-btn';
    employeeButton.type = 'button';
    employeeButton.textContent = 'I am an employee';
    employeeButton.addEventListener('click', onEmployee);

    const visitorButton = document.createElement('button');
    visitorButton.className = 'action-btn';
    visitorButton.type = 'button';
    visitorButton.dataset.variant = 'secondary';
    visitorButton.textContent = 'I am a visitor';
    visitorButton.addEventListener('click', onVisitor);

    row.append(employeeButton, visitorButton);

    return row;
};