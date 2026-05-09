import { useEffect } from 'react';

export function useClickOutside(refs, onClickOutside) {
  useEffect(() => {
    function handleClick(e) {
      const refsArray = Array.isArray(refs) ? refs : [refs];
      const clickedOutside = refsArray.every(ref => 
        !ref.current || !ref.current.contains(e.target)
      );
      if (clickedOutside) onClickOutside();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [refs, onClickOutside]);
}
