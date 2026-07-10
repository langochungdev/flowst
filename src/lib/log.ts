import { useDebugStore } from "../stores/debugStore";

const isDev = import.meta.env.DEV;

function formatMsg(args: unknown[]): { msg: string; rest: unknown[] } {
  if (args.length === 0) return { msg: "", rest: [] };
  if (typeof args[0] === "string") return { msg: args[0], rest: args.slice(1) };
  return { msg: "Log:", rest: args };
}

export const log = {
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
      const { msg, rest } = formatMsg(args);
      useDebugStore.getState().addLog("debug", msg, ...rest);
    }
  },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
      const { msg, rest } = formatMsg(args);
      useDebugStore.getState().addLog("error", msg, ...rest);
    }
  },
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
      const { msg, rest } = formatMsg(args);
      useDebugStore.getState().addLog("debug", msg, ...rest);
    }
  },
};
