import { useState, useEffect, useCallback } from "react";

interface UseSuperAdminTerminalOptions {
  /**
   * The hotkey combination to trigger the terminal.
   * Default: ['ctrl', 'shift', 'm']
   */
  hotkey?: string[];
}

/**
 * Hook to manage superadmin terminal visibility via hotkey
 * Default hotkey: Ctrl+Shift+M
 */
export function useSuperadminTerminal({ hotkey = ["ctrl", "shift", "m"] }: UseSuperAdminTerminalOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if all required keys are pressed
      const isPressed = hotkey.every((key) => {
        if (key === "ctrl") return event.ctrlKey || event.metaKey;
        if (key === "shift") return event.shiftKey;
        if (key === "alt") return event.altKey;
        return event.key.toLowerCase() === key.toLowerCase();
      });

      if (isPressed) {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen((prev) => !prev);
      }
    },
    [hotkey]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const openTerminal = useCallback(() => setIsOpen(true), []);
  const closeTerminal = useCallback(() => setIsOpen(false), []);
  const toggleTerminal = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    openTerminal,
    closeTerminal,
    toggleTerminal,
  };
}
