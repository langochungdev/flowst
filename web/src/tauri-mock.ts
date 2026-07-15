// Tauri API Mocks for Web browser execution
export const invoke = async (cmd: string, args: any = {}) => {
  console.log(`[Tauri Mock] invoke: ${cmd}`, args);
  return null;
};

export const listen = async (event: string, handler: any) => {
  console.log(`[Tauri Mock] listen: ${event}`);
  return async () => { console.log(`[Tauri Mock] unlisten: ${event}`) };
};

export const emit = async (event: string, payload?: any) => {
  console.log(`[Tauri Mock] emit: ${event}`, payload);
};

export const WebviewWindow = {
  getByLabel: async (label: string) => {
    return null;
  }
};

export const getCurrentWebviewWindow = () => {
  return {
    label: 'main',
    close: async () => console.log('[Tauri Mock] window.close()'),
    minimize: async () => console.log('[Tauri Mock] window.minimize()'),
    unminimize: async () => console.log('[Tauri Mock] window.unminimize()'),
  };
};

export const openUrl = async (url: string) => window.open(url, '_blank');
export const openPath = async () => null;
export const open = async () => null;
export const message = async () => null;
export const ask = async () => true;
export const save = async () => null;

export const exists = async () => false;
export const readTextFile = async () => "";
export const writeTextFile = async () => {};
export const readFile = async () => new Uint8Array();
export const writeFile = async () => {};
export const copyFile = async () => {};
export const readDir = async () => [];
export const mkdir = async () => {};
export const remove = async () => {};
export const BaseDirectory = { AppData: 1, Document: 2 };

export const fetch = async () => {};
export const resolveResource = async () => "";

export const isPermissionGranted = async () => true;
export const requestPermission = async () => "granted";
export const sendNotification = () => {};
export const onAction = async () => ({ unregister: async () => {} });

export const join = async (...paths: string[]) => paths.join('/');
export const extname = async (path: string) => path.split('.').pop() || '';
export const appDataDir = async () => '/mock-app-data';

export const getCurrentWindow = () => ({
  startDragging: async () => {}
});
