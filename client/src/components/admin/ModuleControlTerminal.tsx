import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { X, Lock, Terminal as TerminalIcon } from "lucide-react";
import "@xterm/xterm/css/xterm.css";

// Superadmin passphrase (in production, this should be env variable or more secure)
const SUPERADMIN_PASSPHRASE = "superadmin2026";

interface ModuleControlTerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ModuleControl {
  id: string;
  moduleName: string;
  moduleLabel: string;
  enabled: boolean;
  description: string;
}

type AuthState = "locked" | "authenticated";

export function ModuleControlTerminal({ isOpen, onClose }: ModuleControlTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [authState, setAuthState] = useState<AuthState>("locked");
  const modulesRef = useRef<ModuleControl[]>([]);
  const inputBufferRef = useRef<string>("");
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

  const apiCall = useCallback(async (method: string, endpoint: string, body?: any) => {
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return await response.json();
    } catch (error) {
      return { error: `Failed to connect to API: ${error}` };
    }
  }, []);

  const printLine = useCallback((text: string) => {
    terminalInstanceRef.current?.writeln(text);
  }, []);

  const printHeader = useCallback(() => {
    printLine("");
    printLine("\x1b[1;36m╔══════════════════════════════════════════════════════════╗\x1b[0m");
    printLine("\x1b[1;36m║\x1b[0m         \x1b[1;33mSUPERADMIN MODULE CONTROL PANEL\x1b[0m            \x1b[1;36m║\x1b[0m");
    printLine("\x1b[1;36m║\x1b[0m         \x1b[2mSystem Module Management Terminal\x1b[0m            \x1b[1;36m║\x1b[0m");
    printLine("\x1b[1;36m╚══════════════════════════════════════════════════════════╝\x1b[0m");
    printLine("");
  }, [printLine]);

  const showPrompt = useCallback(() => {
    const prefix = authState === "authenticated" ? "\x1b[1;32msuperadmin\x1b[0m" : "\x1b[1;31mlocked\x1b[0m";
    terminalInstanceRef.current?.write(`${prefix}> `);
  }, [authState]);

  const loadModules = useCallback(async () => {
    const data = await apiCall("GET", "/api/module-control");
    if (data.modules) {
      modulesRef.current = data.modules;
    }
    return data;
  }, [apiCall]);

  const handleCommand = useCallback(async (command: string) => {
    const trimmed = command.trim().toLowerCase();
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];

    printLine(`\r\n`);

    if (authState === "locked") {
      if (trimmed === SUPERADMIN_PASSPHRASE) {
        setAuthState("authenticated");
        printLine("\x1b[1;32m✓ Authentication successful. Access granted.\x1b[0m");
        printLine("\x1b[2mType 'help' to see available commands.\x1b[0m");
        await loadModules();
      } else if (trimmed === "exit" || trimmed === "quit") {
        printLine("\x1b[1;33mExiting terminal.\x1b[0m");
        setTimeout(() => onClose(), 500);
      } else if (trimmed) {
        printLine("\x1b[1;31m✗ Authentication required. Enter passphrase to continue.\x1b[0m");
      }
      return;
    }

    // Authenticated commands
    switch (cmd) {
      case "help":
        printLine("\x1b[1;33mAvailable Commands:\x1b[0m");
        printLine("  \x1b[1mlist\x1b[0m                  - List all modules with status");
        printLine("  \x1b[1menable <module>\x1b[0m        - Enable a module");
        printLine("  \x1b[1mdisable <module>\x1b[0m       - Disable a module");
        printLine("  \x1b[1mstatus\x1b[0m                - Show system status");
        printLine("  \x1b[1mseed\x1b[0m                  - Seed default modules (run this first!)");
        printLine("  \x1b[1madd <name> <label>\x1b[0m    - Add a new module");
        printLine("  \x1b[1mremove <module>\x1b[0m       - Remove a module");
        printLine("  \x1b[1mrefresh\x1b[0m               - Refresh module list");
        printLine("  \x1b[1mclear\x1b[0m                 - Clear terminal");
        printLine("  \x1b[1mexit\x1b[0m                  - Close terminal");
        printLine("");
        break;

      case "seed":
        printLine("\x1b[1;33mSeeding default modules...\x1b[0m");
        const seedData = await apiCall("POST", "/api/module-control/seed");
        if (seedData.error) {
          printLine(`\x1b[1;31m✗ ${seedData.error}\x1b[0m`);
        } else {
          printLine(`\x1b[1;32m✓ ${seedData.message}\x1b[0m`);
          await loadModules();
          printLine("\x1b[2mRun 'list' to see all modules.\x1b[0m");
        }
        break;

      case "list":
      case "ls":
        await loadModules();
        printLine("\x1b[1;33mModule Status:\x1b[0m\r\n");
        printLine("\x1b[1mModule Name         Label                  Status\x1b[0m");
        printLine("─".repeat(60));
        modulesRef.current.forEach((mod) => {
          const status = mod.enabled ? "\x1b[1;32m● ENABLED\x1b[0m " : "\x1b[1;31m● DISABLED\x1b[0m";
          const name = mod.moduleName.padEnd(20);
          const label = mod.moduleLabel.padEnd(23);
          printLine(`  ${name} ${label} ${status}`);
        });
        printLine("─".repeat(60));
        const enabledCount = modulesRef.current.filter((m) => m.enabled).length;
        printLine(`\r\n\x1b[1mTotal: ${modulesRef.current.length} modules | Enabled: ${enabledCount} | Disabled: ${modulesRef.current.length - enabledCount}\x1b[0m`);
        printLine("");
        break;

      case "enable": {
        const moduleName = parts[1];
        if (!moduleName) {
          printLine("\x1b[1;31m✗ Error: Module name required. Usage: enable <module>\x1b[0m");
          break;
        }
        const data = await apiCall("PUT", `/api/module-control/${moduleName}`, { enabled: true });
        if (data.error) {
          printLine(`\x1b[1;31m✗ ${data.error}\x1b[0m`);
        } else {
          printLine(`\x1b[1;32m✓ ${data.message}\x1b[0m`);
          await loadModules();
        }
        break;
      }

      case "disable": {
        const moduleName = parts[1];
        if (!moduleName) {
          printLine("\x1b[1;31m✗ Error: Module name required. Usage: disable <module>\x1b[0m");
          break;
        }
        const data = await apiCall("PUT", `/api/module-control/${moduleName}`, { enabled: false });
        if (data.error) {
          printLine(`\x1b[1;31m✗ ${data.error}\x1b[0m`);
        } else {
          printLine(`\x1b[1;32m✓ ${data.message}\x1b[0m`);
          await loadModules();
        }
        break;
      }

      case "status":
        await loadModules();
        const enabled = modulesRef.current.filter((m) => m.enabled).map((m) => m.moduleLabel);
        const disabled = modulesRef.current.filter((m) => !m.enabled).map((m) => m.moduleLabel);
        printLine("\x1b[1;33mSystem Status:\x1b[0m\r\n");
        printLine(`\x1b[1mEnabled Modules (${enabled.length}):\x1b[0m`);
        printLine(`  ${enabled.join(", ") || "None"}`);
        printLine(`\r\n\x1b[1mDisabled Modules (${disabled.length}):\x1b[0m`);
        printLine(`  ${disabled.join(", ") || "None"}`);
        printLine("");
        break;

      case "add": {
        const name = parts[1];
        const label = parts.slice(2).join(" ");
        if (!name || !label) {
          printLine("\x1b[1;31m✗ Error: Usage: add <module_name> <module_label>\x1b[0m");
          break;
        }
        const data = await apiCall("POST", "/api/module-control", {
          moduleName: name,
          moduleLabel: label,
          enabled: true,
        });
        if (data.error) {
          printLine(`\x1b[1;31m✗ ${data.error}\x1b[0m`);
        } else {
          printLine(`\x1b[1;32m✓ ${data.message}\x1b[0m`);
          await loadModules();
        }
        break;
      }

      case "refresh":
        await loadModules();
        printLine("\x1b[1;32m✓ Module list refreshed.\x1b[0m");
        break;

      case "clear":
        terminalInstanceRef.current?.clear();
        break;

      case "exit":
      case "quit":
        printLine("\x1b[1;33mExiting terminal...\x1b[0m");
        setTimeout(() => onClose(), 500);
        break;

      default:
        if (trimmed) {
          printLine(`\x1b[1;31m✗ Unknown command: '${cmd}'. Type 'help' for available commands.\x1b[0m`);
        }
    }
  }, [authState, printLine, apiCall, loadModules, onClose]);

  useEffect(() => {
    if (!isOpen || !terminalRef.current) return;

    // Create terminal instance
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
      theme: {
        background: "#0d1117",
        foreground: "#c9d1d9",
        cursor: "#58a6ff",
        selectionBackground: "#388bfd40",
        black: "#0d1117",
        brightBlack: "#6e7681",
        blue: "#58a6ff",
        brightBlue: "#58a6ff",
        cyan: "#39c5cf",
        brightCyan: "#39c5cf",
        green: "#3fb950",
        brightGreen: "#3fb950",
        magenta: "#bc8cff",
        brightMagenta: "#bc8cff",
        red: "#ff7b72",
        brightRed: "#ff7b72",
        white: "#c9d1d9",
        brightWhite: "#ffffff",
        yellow: "#d29922",
        brightYellow: "#d29922",
      },
      allowProposedApi: true,
      convertEol: true,
      cols: 120,
      rows: 30,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);

    terminalInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initial fit and print
    setTimeout(() => {
      fitAddon.fit();
      term.focus();

      // Print header after terminal is ready
      if (authState === "locked") {
        printLine("\x1b[1;31m╔══════════════════════════════════════════════════════════╗\x1b[0m");
        printLine("\x1b[1;31m║\x1b[0m              \x1b[1;33m🔒 ACCESS RESTRICTED\x1b[0m                   \x1b[1;31m║\x1b[0m");
        printLine("\x1b[1;31m║\x1b[0m       \x1b[2mEnter passphrase to unlock superadmin panel\x1b[0m       \x1b[1;31m║\x1b[0m");
        printLine("\x1b[1;31m╚══════════════════════════════════════════════════════════╝\x1b[0m");
        printLine("");
        printLine("\x1b[2mType 'exit' to close terminal.\x1b[0m");
        printLine("");
      } else {
        printHeader();
      }

      // Show initial prompt
      setTimeout(() => showPrompt(), 50);
    }, 200);

    // Handle input
    let inputBuffer = "";

    term.onKey(({ key, domEvent }) => {
      const ev = domEvent as KeyboardEvent;

      // Handle Enter
      if (ev.key === "Enter") {
        term.write("\r\n");
        if (inputBuffer.trim()) {
          commandHistoryRef.current.unshift(inputBuffer.trim());
          if (commandHistoryRef.current.length > 50) {
            commandHistoryRef.current.pop();
          }
          historyIndexRef.current = -1;
        }
        const command = inputBuffer;
        inputBuffer = "";
        handleCommand(command);
        return;
      }

      // Handle Backspace
      if (ev.key === "Backspace") {
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          term.write("\b \b");
        }
        return;
      }

      // Handle Arrow Up (command history)
      if (ev.key === "ArrowUp") {
        if (commandHistoryRef.current.length > 0 && historyIndexRef.current < commandHistoryRef.current.length - 1) {
          historyIndexRef.current++;
          const prevCommand = commandHistoryRef.current[historyIndexRef.current];
          // Clear current line
          term.write("\r\x1b[K");
          const prefix = authState === "authenticated" ? "superadmin> " : "locked> ";
          term.write(prefix);
          term.write(prevCommand);
          inputBuffer = prevCommand;
        }
        return;
      }

      // Handle Arrow Down (command history)
      if (ev.key === "ArrowDown") {
        if (historyIndexRef.current > 0) {
          historyIndexRef.current--;
          const nextCommand = commandHistoryRef.current[historyIndexRef.current];
          term.write("\r\x1b[K");
          const prefix = authState === "authenticated" ? "superadmin> " : "locked> ";
          term.write(prefix);
          term.write(nextCommand);
          inputBuffer = nextCommand;
        } else {
          historyIndexRef.current = -1;
          term.write("\r\x1b[K");
          const prefix = authState === "authenticated" ? "superadmin> " : "locked> ";
          term.write(prefix);
          inputBuffer = "";
        }
        return;
      }

      // Ignore other control characters
      if (ev.key.length > 1 && !ev.ctrlKey) {
        return;
      }

      // Handle regular characters
      if (key && key.charCodeAt(0) >= 32) {
        inputBuffer += key;
        term.write(key);
      }
    });

    // Handle resize
    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
      terminalInstanceRef.current = null;
      fitAddonRef.current = null;
    };
  }, [isOpen, authState, handleCommand, printHeader, showPrompt, printLine]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
      <div className="relative w-[90vw] max-w-6xl h-[600px] bg-[#0d1117] border border-gray-800 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-gray-800">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-green-500" />
            <span className="text-sm font-mono text-gray-300">
              Superadmin Module Control {authState === "locked" && "(Locked)"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {authState === "locked" && (
              <Lock className="w-3 h-3 text-red-500" />
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal */}
        <div
          ref={terminalRef}
          className="w-full overflow-hidden"
          style={{ height: "calc(600px - 48px)" }}
        />
      </div>
    </div>
  );
}
