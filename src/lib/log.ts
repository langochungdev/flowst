const isDev = import.meta.env.DEV;

export const log = {
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
};
