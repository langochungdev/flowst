// Tauri API Mocks for Web browser execution
export const invoke = async (_cmd: string, _args: any = {}) => {
  return null;
};

export const listen = async (_event: string, _handler: any) => {
  return async () => {};
};

export const emit = async (_event: string, _payload?: any) => {};

export const WebviewWindow = {
  getByLabel: async (_label: string) => {
    return null;
  },
};

export const getCurrentWebviewWindow = () => {
  return {
    label: "main",
    close: async () => {},
    minimize: async () => {},
    unminimize: async () => {},
  };
};

export const openUrl = async (url: string) => window.open(url, "_blank");
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

export const join = async (...paths: string[]) => paths.join("/");
export const extname = async (path: string) => path.split(".").pop() || "";
export const appDataDir = async () => "/mock-app-data";

export const getCurrentWindow = () => ({
  startDragging: async () => {},
});
