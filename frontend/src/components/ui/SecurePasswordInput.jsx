/**
 * Password field kept out of React state / controlled value props.
 * Reduces casual DevTools and fiber inspection; same-machine debuggers can still attach.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const EYE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';

const EYE_OFF_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>';

const LOGIN_STYLES = `
  :host {
    display: block;
    flex: 1;
    min-width: 0;
  }
  .spi-wrap {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }
  input {
    width: 100%;
    height: 46px;
    padding: 0 40px;
    border-radius: 8px;
    border: 1px solid rgb(255 255 255 / 0.32);
    background: rgb(255 255 255 / 0.03);
    color: #fff;
    font: inherit;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }
  input:hover {
    border-color: rgb(255 255 255 / 0.48);
    background: rgb(255 255 255 / 0.05);
  }
  input:focus {
    border-color: var(--border-focus, #fff);
    background: rgb(255 255 255 / 0.06);
    box-shadow: 0 0 0 1px rgb(255 255 255 / 0.12);
  }
  input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  .spi-eye {
    position: absolute;
    right: 12px;
    width: 28px;
    height: 28px;
    border: 0;
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.2s, background-color 0.2s;
    padding: 0;
  }
  .spi-eye:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.15);
  }
`;

const PROFILE_STYLES = `
  :host {
    display: block;
    width: 100%;
  }
  .spi-wrap {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }
  input {
    width: 100%;
    padding: 8px 38px 8px 12px;
    border: 1px solid var(--border-subtle, #222);
    border-radius: var(--radius-md, 6px);
    background: var(--bg-app, #000);
    color: var(--text-primary, #ededed);
    font: inherit;
    font-size: 0.85rem;
    outline: none;
    transition: border-color 0.12s, box-shadow 0.12s;
    box-sizing: border-box;
  }
  input:hover {
    border-color: var(--border-strong, #333);
  }
  input:focus {
    border-color: var(--border-focus, #fff);
    box-shadow: 0 0 0 1px var(--border-focus, #fff);
  }
  input::placeholder {
    color: var(--text-tertiary, #71717a);
  }
  .spi-eye {
    position: absolute;
    right: 10px;
    width: 20px;
    height: 20px;
    border: 0;
    background: transparent;
    color: var(--text-tertiary, #71717a);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm, 4px);
    padding: 0;
  }
  .spi-eye:hover {
    color: var(--text-primary, #ededed);
  }
`;

function computeMetrics(value) {
  return {
    length: value.length,
    hasUpper: /[A-Z]/.test(value),
    hasLower: /[a-z]/.test(value),
    hasDigit: /\d/.test(value),
    hasSpecial: /[^A-Za-z0-9]/.test(value),
  };
}

const SecurePasswordInput = forwardRef(function SecurePasswordInput(
  {
    id,
    name,
    placeholder,
    autoComplete = 'current-password',
    required = false,
    autoFocus = false,
    variant = 'login',
    className = '',
    onEmptyChange,
    onMetricsChange,
    showToggle = true,
    showLabel = 'Show password',
    hideLabel = 'Hide password',
  },
  ref,
) {
  const hostRef = useRef(null);
  const inputRef = useRef(null);
  const toggleRef = useRef(null);
  const visibleRef = useRef(false);
  const onEmptyChangeRef = useRef(onEmptyChange);
  const onMetricsChangeRef = useRef(onMetricsChange);

  onEmptyChangeRef.current = onEmptyChange;
  onMetricsChangeRef.current = onMetricsChange;

  useImperativeHandle(ref, () => ({
    getValue: () => inputRef.current?.value ?? '',
    clear: () => {
      const input = inputRef.current;
      if (!input) return;
      input.value = '';
      onEmptyChangeRef.current?.(true);
      onMetricsChangeRef.current?.(computeMetrics(''));
    },
    focus: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let input = host._spiInput;
    let toggle = host._spiToggle;

    if (!input) {
      const shadow = host.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = variant === 'profile' ? PROFILE_STYLES : LOGIN_STYLES;

      const wrap = document.createElement('div');
      wrap.className = 'spi-wrap';

      input = document.createElement('input');
      input.type = 'password';
      input.spellcheck = false;

      wrap.appendChild(input);

      if (showToggle) {
        toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'spi-eye';
        toggle.innerHTML = EYE_SVG;
        toggle.setAttribute('aria-label', showLabel);
        toggle.setAttribute('aria-pressed', 'false');
        toggle.addEventListener('click', () => {
          visibleRef.current = !visibleRef.current;
          input.type = visibleRef.current ? 'text' : 'password';
          toggle.innerHTML = visibleRef.current ? EYE_OFF_SVG : EYE_SVG;
          toggle.setAttribute('aria-label', visibleRef.current ? hideLabel : showLabel);
          toggle.setAttribute('aria-pressed', String(visibleRef.current));
        });
        wrap.appendChild(toggle);
      }

      shadow.append(style, wrap);
      host._spiInput = input;
      host._spiToggle = toggle ?? null;
    }

    inputRef.current = input;
    toggleRef.current = toggle ?? null;

    const notify = () => {
      const value = input.value;
      onEmptyChangeRef.current?.(value.length === 0);
      onMetricsChangeRef.current?.(computeMetrics(value));
    };

    input.addEventListener('input', notify);
    notify();

    return () => {
      input.removeEventListener('input', notify);
      inputRef.current = null;
      toggleRef.current = null;
    };
    // Shadow tree is created once per mount; variant/toggle are fixed per instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.autocomplete = autoComplete;
    if (id) input.id = id;
    else input.removeAttribute('id');
    if (name) input.name = name;
    else input.removeAttribute('name');
    if (placeholder) input.placeholder = placeholder;
    else input.removeAttribute('placeholder');
    input.required = required;
    if (autoFocus) input.focus();
  }, [autoComplete, autoFocus, id, name, placeholder, required]);

  useEffect(() => {
    const toggle = toggleRef.current;
    if (!toggle) return;
    if (!visibleRef.current) toggle.setAttribute('aria-label', showLabel);
  }, [showLabel, hideLabel]);

  useEffect(() => {
    if (!id) return;
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (!label) return;
    const focusInput = () => inputRef.current?.focus();
    label.addEventListener('click', focusInput);
    return () => label.removeEventListener('click', focusInput);
  }, [id]);

  return <div ref={hostRef} className={className} data-secure-password="" />;
});

export default SecurePasswordInput;
