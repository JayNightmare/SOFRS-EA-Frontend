import { View, navigate } from '../../renderer';
import { createAdminDashboard } from '../admin/dashboard';

export const createAdminPinModal = (): View => {
  const overlay = document.createElement('div');
  overlay.className = 'pin-overlay';

  const modal = document.createElement('div');
  modal.className = 'pin-modal';

  const title = document.createElement('h2');
  title.textContent = 'Admin Access';

  const input = document.createElement('input');
  input.type = 'password';
  input.maxLength = 4;
  input.placeholder = '••••';
  input.className = 'pin-input';
  input.autocomplete = 'new-password';

  const message = document.createElement('p');
  message.className = 'pin-message';

  const btnGroup = document.createElement('div');
  btnGroup.className = 'pin-btn-group';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'pin-btn cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => {
    overlay.remove();
  });

  const submitBtn = document.createElement('button');
  submitBtn.className = 'pin-btn submit';
  submitBtn.textContent = 'Enter';
  submitBtn.type = 'button';

  const checkPin = () => {
    const val = input.value;
    // VERY simple hardcoded PIN block for this prototype
    if (val === '1234') {
      overlay.remove();
      void navigate(createAdminDashboard);
    } else {
      message.textContent = 'Invalid PIN.';
      message.style.color = '#ff4d4f';
      input.value = '';
      input.focus();
    }
  };

  submitBtn.addEventListener('click', checkPin);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkPin();
    if (e.key === 'Escape') overlay.remove();
  });

  btnGroup.append(cancelBtn, submitBtn);
  modal.append(title, message, input, btnGroup);
  overlay.append(modal);

  setTimeout(() => input.focus(), 50);

  return {
    element: overlay,
  };
};
