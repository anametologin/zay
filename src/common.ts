enum Shortcut {
  ShowHops,
}

interface IShortcuts {
  getShowHops(): ShortcutHandler;
}
interface IDBusCals {
  getDbusKeySeq(): DBusCall;
  getDbusInitAction(): DBusCall;
}

interface IConfig {}

interface IDriverContext {
  zayAction: boolean;
  workspace: Workspace;
  ticTimer: QQmlTimer;
  actionTimer: QQmlTimer;
  actionWindows: { [hop: string]: KwinWindow };
  dbusGetKeySeq: DBusCall;
  dbusInitAction: DBusCall;
  wasActive: KwinWindow | null;
  zayWindow: KwinWindow | null;
  actionDuration: number;
  readonly backend: string;
}

let CONFIG: IConfig;
