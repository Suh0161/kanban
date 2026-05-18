import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Local-state input + debounced commit.
 *
 * Why this exists: text inputs that wire directly into a parent's
 * `onChange={e => onUpdateThing(...e.target.value)}` re-render the whole
 * board on every keystroke and (in our case) fire a network PATCH per
 * character. Typing felt heavy. Wrap those inputs with this hook so the
 * input is fast (local state only) and the parent only hears about the
 * change after the user pauses or blurs.
 *
 * Usage:
 *   const { localValue, onChange, onBlur, flush } = useDebouncedCommit({
 *     value: task.title,
 *     onCommit: next => onUpdateTask(task.id, { title: next }),
 *     delay: 400,
 *   });
 *
 *   <input value={localValue} onChange={onChange} onBlur={onBlur} />
 *
 * The hook keeps `localValue` in sync with `value` whenever the parent
 * value changes from the outside (e.g. after a refetch or another tab),
 * but only when the user isn't currently editing — otherwise typing
 * would get stomped by the in-flight commit.
 */
export default function useDebouncedCommit({ value, onCommit, delay = 400 }) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const isEditingRef = useRef(false);
  const pendingValueRef = useRef(value ?? '');
  const timerRef = useRef(null);
  const onCommitRef = useRef(onCommit);

  // Keep the latest onCommit without restarting the timer.
  useEffect(() => { onCommitRef.current = onCommit; }, [onCommit]);

  // Sync external changes ONLY when the user isn't editing locally.
  useEffect(() => {
    if (isEditingRef.current) return;
    setLocalValue(value ?? '');
    pendingValueRef.current = value ?? '';
  }, [value]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const commit = useCallback(() => {
    clearTimer();
    isEditingRef.current = false;
    const next = pendingValueRef.current;
    if (next === (value ?? '')) return;
    onCommitRef.current?.(next);
  }, [value]);

  const onChange = useCallback((eventOrValue) => {
    const next = typeof eventOrValue === 'string'
      ? eventOrValue
      : eventOrValue?.target?.value ?? '';
    isEditingRef.current = true;
    pendingValueRef.current = next;
    setLocalValue(next);
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      commit();
    }, delay);
  }, [commit, delay]);

  const onBlur = useCallback(() => {
    commit();
  }, [commit]);

  // Flush on unmount so a navigation away mid-typing doesn't drop edits.
  useEffect(() => {
    return () => {
      if (isEditingRef.current) {
        const next = pendingValueRef.current;
        if (next !== (value ?? '')) {
          onCommitRef.current?.(next);
        }
      }
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { localValue, onChange, onBlur, flush: commit, setLocalValue };
}
