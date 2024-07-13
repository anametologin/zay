var KWIN: KWin;

class KWinDriver implements IDriverContext {
  public static backendName: string = "kwin";
  public static eng_alphabet = "abcdefghijklmnopqrstuvwxyz";

  public get zayWindow(): KwinWindow | null {
    return this.__zayWindow;
  }
  public set zayWindow(zayWindow: KwinWindow) {
    zayWindow.skipTaskbar = true;
    zayWindow.skipPager = true;
    zayWindow.skipSwitcher = true;
    zayWindow.onAllDesktops = true;
    zayWindow.skipsCloseAnimation = true;
    zayWindow.shade = false;
    zayWindow.keepAbove = false;
    // zayWindow.noBorder = true;
    // zayWindow.setMaximize(true, false);
    this.__zayWindow = zayWindow;
  }

  public get backend(): string {
    return KWinDriver.backendName;
  }

  public workspace: Workspace;
  public zayAction: boolean;
  public ticTimer: QQmlTimer;
  public actionTimer: QQmlTimer;
  public actionDuration: number;
  public actionWindows: { [hop: string]: KwinWindow };
  public dbusGetKeySeq: DBusCall;
  public dbusInitAction: DBusCall;
  public wasActive: KwinWindow | null;
  private shortcuts: IShortcuts;
  private __zayWindow: KwinWindow | null;
  private entered: boolean;

  constructor(api: Api) {
    KWIN = api.kwin;
    this.workspace = api.workspace;
    this.shortcuts = api.shortcuts;
    this.actionDuration = 6000;
    this.ticTimer = Qt.createQmlObject(
      "import QtQuick 2.0; Timer {}",
      scriptRoot
    );
    this.ticTimer.interval = 200;
    this.ticTimer.repeat = false;
    this.dbusGetKeySeq = api.dbus.getDbusKeySeq();
    this.dbusGetKeySeq.finished.connect((raw_input) => {
      this.getKeySeqCallback(this, raw_input);
    });
    this.ticTimer.triggered.connect(() => this.dbusGetKeySeq.call());

    this.actionTimer = Qt.createQmlObject(
      "import QtQuick 2.0; Timer {}",
      scriptRoot
    );
    this.actionTimer.interval = this.actionDuration;
    this.actionTimer.repeat = false;
    this.actionTimer.triggered.connect(() => this.actionEndCallback(this));
    this.dbusInitAction = api.dbus.getDbusInitAction();
    this.dbusInitAction.finished.connect(() =>
      this.ticTimerRestartCallback(this)
    );
    this.zayAction = false;
    this.__zayWindow = null;
    this.actionWindows = {};
    this.wasActive = null;
    this.entered = false;
  }

  /*
   * Main
   */

  public main() {
    // CONFIG = KWINCONFIG = new KWinConfig();
    this.bindEvents();
    this.bindShortcut();
    const clients: KwinWindow[] = this.workspace.stackingOrder;
    for (let i = 0; i < clients.length; i++) {
      print(`Zay start window: ${debugWin(clients[i])}`);
      if (clients[i].caption === "zay") {
        this.zayWindow = clients[i];
        break;
      }
    }
  }

  ticTimerRestartCallback(ctx: IDriverContext) {
    ctx.ticTimer.restart();
  }

  actionEndCallback(ctx: IDriverContext) {
    if (ctx.zayAction) {
      ctx.zayAction = false;
      ctx.workspace.activeWindow = ctx.wasActive;
      scriptRoot.hidePopups();
    }
  }

  private bindShortcut() {
    this.shortcuts
      .getShowHops()
      .activated.connect(() => this.showHopsCallback(this));
  }

  getKeySeqCallback(ctx: IDriverContext, raw_input: any[]) {
    // print(`getKeySeqCallback: Raw_input:"${raw_input}"`);
    let s = String(raw_input);
    if (ctx.zayAction === false) {
      return;
    }
    if (s.length === 0) {
      // print("dbus ticTimer restart");
      ctx.ticTimer.restart();
      return;
    }
    if (s === "#escape" || ctx.actionWindows[s] === undefined) {
      // print("action escaped");
      ctx.workspace.activeWindow = ctx.wasActive;
    } else {
      ctx.workspace.activeWindow = ctx.actionWindows[s];
    }
    ctx.zayAction = false;
    scriptRoot.hidePopups();
  }

  showHopsCallback(ctx: IDriverContext) {
    if (ctx.zayAction) return;
    function getHopString(i: number): string {
      let s = KWinDriver.eng_alphabet[i % KWinDriver.eng_alphabet.length];
      let multiplier = Math.floor(i / KWinDriver.eng_alphabet.length);
      while (multiplier > 0) {
        s += s;
        multiplier -= 1;
      }
      return s;
    }
    const clients: KwinWindow[] = ctx.workspace.stackingOrder;
    const currentVirtualDesktopName: string = ctx.workspace.currentDesktop.name;
    const currentActivity: string = ctx.workspace.currentActivity;

    let hops: [string, number, number][] = [];
    let keys_len: number = 0;
    let j = 0;

    for (let i = clients.length; i > 0; i--) {
      let win: KwinWindow = clients[i - 1];
      print(debugWin(win));
      if (!win.normalWindow || win.dock || win.specialWindow || win.hidden)
        continue;
      const winSquare = win.width * win.height;
      const winDesktops: VirtualDesktop[] = win.desktops;
      const winActivities: string[] = win.activities;
      const isOnVDesktop: boolean =
        winDesktops.length === 0 ||
        winDesktops.some(
          (vDesktop) => vDesktop.name === currentVirtualDesktopName
        );
      const isOnActivity: boolean =
        winActivities.length === 0 ||
        winActivities.some((activityName) => activityName === currentActivity);

      if (win.minimized || winSquare < 100 || !isOnVDesktop || !isOnActivity)
        continue;
      let hop = getHopString(j);
      keys_len = Math.max(hop.length, keys_len);

      j += 1;
      hops.push([hop, win.x, win.y]);
      ctx.actionWindows[hop] = win;
      // print(`WinOnScreen: ${clients[i].caption}:${clients[i].onScreenDisplay}`);
    }
    if (hops.length !== 0) {
      ctx.wasActive = ctx.workspace.activeWindow;
      ctx.zayAction = true;
      ctx.workspace.activeWindow = ctx.zayWindow;
      scriptRoot.show(hops);
      ctx.actionTimer.restart();
      ctx.dbusInitAction.arguments = [ctx.actionDuration, keys_len];
      ctx.dbusInitAction.call();
    }
  }

  private connect(
    signal: Signal<(...args: any[]) => void>,
    handler: (..._: any[]) => void
  ): () => void {
    const wrapper = (...args: any[]) => {
      /* HACK: `workspace` become undefined when the script is disabled. */
      if (typeof this.workspace === "undefined") signal.disconnect(wrapper);
      else this.enter(() => handler.apply(this, args));
    };
    signal.connect(wrapper);

    return wrapper;
  }
  private enter(callback: () => void) {
    if (this.entered) return;

    this.entered = true;
    try {
      callback();
    } catch (e: any) {
      print("Error raised from line " + e.lineNumber);
      print(e);
    } finally {
      this.entered = false;
    }
  }

  private bindEvents() {
    this.connect(this.workspace.windowAdded, (kwinWindow: KwinWindow) => {
      if (kwinWindow.resourceName === "zayka") {
        this.zayWindow = kwinWindow;
      }
    });
    this.connect(this.workspace.windowActivated, (kwinWindow: KwinWindow) => {
      if (
        this.zayWindow !== null &&
        kwinWindow !== null &&
        kwinWindow.internalId === this.zayWindow.internalId &&
        !this.zayAction
      ) {
        this.workspace.activeWindow = null;
      }
    });
  }
}
