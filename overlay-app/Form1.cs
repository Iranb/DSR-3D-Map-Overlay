using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace DSRMapOverlay;

public partial class Form1 : Form
{
    private const int HotkeyToggleVisibility = 0x5101;
    private const int HotkeyToggleLock = 0x5102;
    private const int HotkeyCompactWindow = 0x5103;
    private const int HotkeyPreviousMap = 0x5104;
    private const int HotkeyNextMap = 0x5105;
    private const int HotkeyToggleExpanded = 0x5106;
    private const int WmHotkey = 0x0312;
    private const uint ModControl = 0x0002;
    private const uint ModShift = 0x0004;
    private const int GwlExStyle = -20;
    private const int GwlStyle = -16;
    private const long WsExTransparent = 0x00000020L;
    private const long WsCaption = 0x00C00000L;
    private const long WsThickFrame = 0x00040000L;
    private const long WsMinimizeBox = 0x00020000L;
    private const long WsMaximizeBox = 0x00010000L;
    private const long WsSystemMenu = 0x00080000L;
    private const long WsPopup = unchecked((long)0x80000000);
    private const uint SwpNoZOrder = 0x0004;
    private const uint SwpNoActivate = 0x0010;
    private const uint SwpFrameChanged = 0x0020;
    private const uint SwpShowWindow = 0x0040;
    private const int TouchpadPressSamples = 2;
    private const int TouchpadReleaseSamples = 4;

    private readonly WebView2 webView = new();
    private readonly System.Windows.Forms.Timer gameTimer = new() { Interval = 1200 };
    private readonly System.Windows.Forms.Timer positionTimer = new() { Interval = 100 };
    private readonly System.Windows.Forms.Timer progressTimer = new() { Interval = 1500 };
    private readonly System.Windows.Forms.Timer gamepadTimer = new() { Interval = 16 };
    private readonly DsrPositionReader positionReader;
    private readonly GamepadReader gamepadReader = new();
    private readonly NotifyIcon trayIcon = new();
    private readonly bool forceShow;
    private readonly bool english;
    private readonly string settingsPath;
    private OverlaySettings settings = new();
    private ToolStripMenuItem? onlyInGameMenuItem;
    private ToolStripMenuItem? lockMenuItem;
    private ToolStripMenuItem? gamepadModeMenuItem;
    private ToolStripMenuItem? autoBorderlessMenuItem;
    private bool gameWasRunning;
    private bool manuallyHidden;
    private bool manuallyShown;
    private bool exiting;
    private bool webReady;
    private double desiredOpacity;
    private string trackingState = "waiting";
    private string trackingMessage = "";
    private PlayerPosition? latestPosition;
    private AutoProgressSnapshot? latestAutoProgress;
    private string autoProgressSignature = "";
    private bool gamepadMode;
    private bool gamepadChordLatched;
    private ushort previousGamepadButtons;
    private IntPtr gameWindowBeforeGamepadMode;
    private string gamepadSource = "";
    private bool borderlessApplied;
    private bool mapWindowExpanded;
    private bool suppressBoundsSave;
    private bool touchpadToggleLatched;
    private int touchpadPressedSamples;
    private int touchpadReleasedSamples;
    public string? RestartLanguage { get; private set; }

    public Form1(bool forceShow, string? languageOverride = null)
    {
        InitializeComponent();
        this.forceShow = forceShow;
        settingsPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "DSRMapOverlay",
            "settings.json");
        settings = LoadSettings();
        english = (languageOverride ?? settings.Language).StartsWith("en", StringComparison.OrdinalIgnoreCase);
        positionReader = new DsrPositionReader(english);
        trackingMessage = T("等待 DarkSoulsRemastered.exe", "Waiting for DarkSoulsRemastered.exe");
        gamepadSource = T("未连接", "Not connected");
        desiredOpacity = Math.Clamp(settings.Opacity, 0.40, 1.0);
        if (settings.AutoBorderlessFullscreen) EnsureBorderlessGameConfig(showNotification: false);

        Text = T("黑魂重制版 3D 地图悬浮窗", "DSR 3D Map Overlay");
        StartPosition = FormStartPosition.Manual;
        ShowInTaskbar = true;
        TopMost = true;
        MinimumSize = new Size(420, 300);
        Bounds = GetSafeBounds(settings);
        FormBorderStyle = settings.Locked ? FormBorderStyle.None : FormBorderStyle.Sizable;
        Opacity = 0;

        webView.Dock = DockStyle.Fill;
        webView.DefaultBackgroundColor = Color.FromArgb(7, 10, 15);
        Controls.Add(webView);

        BuildTrayMenu();
        gameTimer.Tick += (_, _) => CheckGameState();
        positionTimer.Tick += (_, _) => ReadPlayerPosition();
        progressTimer.Tick += (_, _) => ReadAutoProgress();
        gamepadTimer.Tick += (_, _) => PollGamepad();
        Move += (_, _) => SaveBoundsIfAppropriate();
        Resize += (_, _) => SaveBoundsIfAppropriate();
        FormClosing += OnFormClosing;
        Shown += OnShown;
        TraceState(T("构造完成", "Construction completed"));
    }

    private string T(string chinese, string englishText) => english ? englishText : chinese;

    protected override bool ShowWithoutActivation => true;

    protected override CreateParams CreateParams
    {
        get
        {
            var parameters = base.CreateParams;
            if (settings.Locked)
            {
                parameters.ExStyle |= (int)WsExTransparent;
            }
            return parameters;
        }
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        NativeMethods.RegisterHotKey(Handle, HotkeyToggleVisibility, ModControl | 0x0001, (uint)Keys.M);
        NativeMethods.RegisterHotKey(Handle, HotkeyToggleLock, ModControl | 0x0001, (uint)Keys.L);
        NativeMethods.RegisterHotKey(Handle, HotkeyCompactWindow, ModControl | 0x0001, (uint)Keys.R);
        NativeMethods.RegisterHotKey(Handle, HotkeyPreviousMap, ModControl | 0x0001, (uint)Keys.Left);
        NativeMethods.RegisterHotKey(Handle, HotkeyNextMap, ModControl | 0x0001, (uint)Keys.Right);
        NativeMethods.RegisterHotKey(Handle, HotkeyToggleExpanded, ModControl | 0x0001, (uint)Keys.F);
    }

    protected override void OnHandleDestroyed(EventArgs e)
    {
        NativeMethods.UnregisterHotKey(Handle, HotkeyToggleVisibility);
        NativeMethods.UnregisterHotKey(Handle, HotkeyToggleLock);
        NativeMethods.UnregisterHotKey(Handle, HotkeyCompactWindow);
        NativeMethods.UnregisterHotKey(Handle, HotkeyPreviousMap);
        NativeMethods.UnregisterHotKey(Handle, HotkeyNextMap);
        NativeMethods.UnregisterHotKey(Handle, HotkeyToggleExpanded);
        base.OnHandleDestroyed(e);
    }

    protected override void WndProc(ref Message m)
    {
        if (m.Msg == WmHotkey)
        {
            if (m.WParam.ToInt32() == HotkeyToggleVisibility) ToggleVisibility();
            if (m.WParam.ToInt32() == HotkeyToggleLock) ToggleLock();
            if (m.WParam.ToInt32() == HotkeyCompactWindow) RestoreCompactWindow();
            if (m.WParam.ToInt32() == HotkeyPreviousMap) CycleMap(-1);
            if (m.WParam.ToInt32() == HotkeyNextMap) CycleMap(1);
            if (m.WParam.ToInt32() == HotkeyToggleExpanded) ToggleExpandedMapWindow();
        }
        base.WndProc(ref m);
    }

    private async void OnShown(object? sender, EventArgs e)
    {
        TraceState(T("Shown 事件开始", "Shown event started"));
        var gameProcess = FindGameProcess();
        gameWasRunning = gameProcess is not null;
        UpdatePositionReader(gameProcess);
        if (forceShow || !settings.OnlyWhenGameRunning || gameWasRunning)
        {
            ShowOverlay();
        }
        else
        {
            Hide();
            trayIcon.ShowBalloonTip(
                2500,
                T("黑魂重制版 3D 地图", "DSR 3D Map"),
                T("已在后台等待 DarkSoulsRemastered.exe。Ctrl+Alt+M 可随时预览。", "Waiting for DarkSoulsRemastered.exe in the background. Press Ctrl+Alt+M to preview at any time."),
                ToolTipIcon.Info);
        }

        gameTimer.Start();
        positionTimer.Start();
        progressTimer.Start();
        gamepadTimer.Start();
        await InitializeWebViewAsync();
        TraceState(T("WebView 初始化返回", "WebView initialization returned"));
        ApplyLockState(settings.Locked, save: false);
    }

    private async Task InitializeWebViewAsync()
    {
        try
        {
            TraceState(T("开始初始化 WebView2", "Initializing WebView2"));
            var userDataFolder = Path.Combine(Path.GetDirectoryName(settingsPath)!, "WebView2");
            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: userDataFolder);
            await webView.EnsureCoreWebView2Async(environment);
            TraceState(T("WebView2 Core 就绪", "WebView2 Core ready"));
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
            webView.CoreWebView2.NavigationCompleted += (_, _) =>
            {
                webReady = true;
                TraceState(T("地图页面导航完成", "Map page navigation completed"));
                SyncLockStateToWeb();
                PublishTrackingState();
                PublishLatestPosition();
                PublishLatestAutoProgress();
                PublishGamepadMode();
                PublishWindowMode();
            };

            var webRoot = Path.Combine(AppContext.BaseDirectory, "web");
            if (!File.Exists(Path.Combine(webRoot, "overlay.html")))
            {
                throw new FileNotFoundException(T("找不到地图页面。", "Map page not found."), Path.Combine(webRoot, "overlay.html"));
            }

            webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "dsr-map.local",
                webRoot,
                CoreWebView2HostResourceAccessKind.Allow);
            webView.Source = new Uri("https://dsr-map.local/overlay.html?lang=" + (english ? "en" : "zh-CN"));
            TraceState(T("地图页面开始导航", "Map page navigation started"));
        }
        catch (Exception exception)
        {
            MessageBox.Show(
                T("3D 地图初始化失败：\n\n", "Failed to initialize the 3D map:\n\n") + exception.Message,
                T("黑魂重制版 3D 地图", "DSR 3D Map"),
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }

    private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            TraceState(T("页面消息 ", "Page message ") + e.WebMessageAsJson);
            using var document = JsonDocument.Parse(e.WebMessageAsJson);
            var action = document.RootElement.GetProperty("action").GetString();
            if (action == "toggle-lock") ToggleLock();
            if (action == "hide") HideManually();
            if (action == "compact") RestoreCompactWindow();
            if (action == "set-language" && document.RootElement.TryGetProperty("language", out var languageElement))
            {
                SwitchLanguage(languageElement.GetString());
            }
        }
        catch
        {
            // Ignore malformed messages from the local page.
        }
    }

    private void SwitchLanguage(string? language)
    {
        var normalized = language?.StartsWith("en", StringComparison.OrdinalIgnoreCase) == true ? "en" : "zh-CN";
        if ((normalized == "en") == english) return;
        settings.Language = normalized;
        SaveSettings();
        RestartLanguage = normalized;
        ExitApplication();
    }

    private void BuildTrayMenu()
    {
        var menu = new ContextMenuStrip();
        menu.Items.Add(T("显示 / 隐藏（Ctrl+Alt+M）", "Show / Hide (Ctrl+Alt+M)"), null, (_, _) => ToggleVisibility());
        menu.Items.Add(T("全屏地图 / 右上角小窗（触摸板 / Ctrl+Alt+F）", "Full map / top-right compact window (touchpad / Ctrl+Alt+F)"), null, (_, _) => ToggleExpandedMapWindow());
        menu.Items.Add(T("恢复右上角小窗（Ctrl+Alt+R）", "Restore compact top-right window (Ctrl+Alt+R)"), null, (_, _) => RestoreCompactWindow());
        menu.Items.Add(T("上一张地图（Ctrl+Alt+←）", "Previous map (Ctrl+Alt+←)"), null, (_, _) => CycleMap(-1));
        menu.Items.Add(T("下一张地图（Ctrl+Alt+→）", "Next map (Ctrl+Alt+→)"), null, (_, _) => CycleMap(1));
        gamepadModeMenuItem = new ToolStripMenuItem(T("手柄地图模式（DualSense 麦克风键）", "Gamepad map mode (DualSense mic button)"), null, (_, _) => ToggleGamepadMode());
        menu.Items.Add(gamepadModeMenuItem);
        autoBorderlessMenuItem = new ToolStripMenuItem(T("无边框全屏（先设为窗口模式）", "Automatic borderless fullscreen (restart game)"))
        {
            Checked = settings.AutoBorderlessFullscreen,
            CheckOnClick = true
        };
        autoBorderlessMenuItem.CheckedChanged += (_, _) =>
        {
            settings.AutoBorderlessFullscreen = autoBorderlessMenuItem.Checked;
            SaveSettings();
            if (settings.AutoBorderlessFullscreen) EnsureBorderlessGameConfig(showNotification: true);
        };
        menu.Items.Add(autoBorderlessMenuItem);
        lockMenuItem = new ToolStripMenuItem(T("锁定鼠标穿透（Ctrl+Alt+L）", "Lock mouse passthrough (Ctrl+Alt+L)"), null, (_, _) => ToggleLock())
        {
            Checked = settings.Locked
        };
        menu.Items.Add(lockMenuItem);

        var opacityMenu = new ToolStripMenuItem(T("透明度", "Opacity"));
        AddOpacityItem(opacityMenu, "100%", 1.0);
        AddOpacityItem(opacityMenu, "85%", 0.85);
        AddOpacityItem(opacityMenu, "70%", 0.70);
        AddOpacityItem(opacityMenu, "55%", 0.55);
        menu.Items.Add(opacityMenu);

        onlyInGameMenuItem = new ToolStripMenuItem(T("仅在游戏运行时显示", "Show only while the game is running"))
        {
            Checked = settings.OnlyWhenGameRunning,
            CheckOnClick = true
        };
        onlyInGameMenuItem.CheckedChanged += (_, _) =>
        {
            settings.OnlyWhenGameRunning = onlyInGameMenuItem.Checked;
            manuallyHidden = false;
            manuallyShown = false;
            SaveSettings();
            CheckGameState();
        };
        menu.Items.Add(onlyInGameMenuItem);
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add(T("退出", "Exit"), null, (_, _) => ExitApplication());

        trayIcon.Icon = SystemIcons.Application;
        trayIcon.Text = T("黑魂重制版 3D 地图悬浮窗", "DSR 3D Map Overlay");
        trayIcon.ContextMenuStrip = menu;
        trayIcon.Visible = true;
        trayIcon.DoubleClick += (_, _) => ToggleVisibility();
    }

    private void AddOpacityItem(ToolStripMenuItem parent, string label, double opacity)
    {
        var item = new ToolStripMenuItem(label)
        {
            Checked = Math.Abs(desiredOpacity - opacity) < 0.01
        };
        item.Click += (_, _) =>
        {
            desiredOpacity = opacity;
            settings.Opacity = opacity;
            foreach (ToolStripMenuItem sibling in parent.DropDownItems.OfType<ToolStripMenuItem>())
            {
                sibling.Checked = ReferenceEquals(sibling, item);
            }
            if (Visible) Opacity = desiredOpacity;
            SaveSettings();
        };
        parent.DropDownItems.Add(item);
    }

    private void CheckGameState()
    {
        var process = FindGameProcess();
        var isRunning = process is not null;

        if (isRunning && settings.AutoBorderlessFullscreen)
        {
            ApplyBorderlessGameWindow(process!);
        }

        if (isRunning && !gameWasRunning)
        {
            manuallyHidden = false;
            manuallyShown = false;
            MoveToGameScreenIfNeeded(process!);
        }
        else if (!isRunning && gameWasRunning)
        {
            if (gamepadMode) ExitGamepadMode(restoreGameFocus: false);
            manuallyShown = false;
        }

        UpdatePositionReader(process);
        gameWasRunning = isRunning;

        var shouldShow = manuallyShown ||
            (!manuallyHidden && (!settings.OnlyWhenGameRunning || isRunning));
        if (shouldShow) ShowOverlay();
        else if (Visible) Hide();
    }

    private void EnsureBorderlessGameConfig(bool showNotification)
    {
        if (showNotification) trayIcon.ShowBalloonTip(2500, "无边框窗口", "请先在游戏设置中选择窗口模式；工具仅调整窗口边框，不修改游戏配置。", ToolTipIcon.Info);
    }

    private void ApplyBorderlessGameWindow(Process process)
    {
        var gameWindow = process.MainWindowHandle;
        if (gameWindow == IntPtr.Zero || NativeMethods.IsIconic(gameWindow)) return;

        var screenBounds = Screen.FromHandle(gameWindow).Bounds;
        var style = NativeMethods.GetWindowLongPtr(gameWindow, GwlStyle).ToInt64();
        var borderlessStyle = style & ~(WsCaption | WsThickFrame | WsMinimizeBox | WsMaximizeBox | WsSystemMenu);
        borderlessStyle |= WsPopup;
        if (borderlessStyle != style)
        {
            NativeMethods.SetWindowLongPtr(gameWindow, GwlStyle, new IntPtr(borderlessStyle));
        }

        NativeMethods.GetWindowRect(gameWindow, out var currentRect);
        var alreadySized = currentRect.Left == screenBounds.Left &&
            currentRect.Top == screenBounds.Top &&
            currentRect.Right - currentRect.Left == screenBounds.Width &&
            currentRect.Bottom - currentRect.Top == screenBounds.Height;
        if (borderlessStyle == style && alreadySized) return;

        var succeeded = NativeMethods.SetWindowPos(
            gameWindow,
            IntPtr.Zero,
            screenBounds.Left,
            screenBounds.Top,
            screenBounds.Width,
            screenBounds.Height,
            SwpNoZOrder | SwpNoActivate | SwpFrameChanged | SwpShowWindow);
        if (succeeded && !borderlessApplied)
        {
            borderlessApplied = true;
            TraceState(english
                ? $"Game window changed to borderless fullscreen · {screenBounds.Width}×{screenBounds.Height}"
                : $"游戏窗口已切为无边框全屏 · {screenBounds.Width}×{screenBounds.Height}");
        }
    }

    private static string? ReadXmlElementValue(string text, string elementName)
    {
        var match = Regex.Match(
            text,
            $@"<{Regex.Escape(elementName)}>([^<]*)</{Regex.Escape(elementName)}>",
            RegexOptions.IgnoreCase);
        return match.Success ? match.Groups[1].Value : null;
    }

    private static string ReplaceXmlElementValue(string text, string elementName, string value)
    {
        var escaped = Regex.Escape(elementName);
        return Regex.Replace(
            text,
            $@"(<{escaped}>)[^<]*(</{escaped}>)",
            match => match.Groups[1].Value + value + match.Groups[2].Value,
            RegexOptions.IgnoreCase);
    }

    private void UpdatePositionReader(Process? process)
    {
        if (process is null)
        {
            if (positionReader.IsAttached) positionReader.Detach();
            latestPosition = null;
            latestAutoProgress = null;
            autoProgressSignature = "";
            SetTrackingState("waiting", T("等待游戏启动", "Waiting for the game to start"));
            return;
        }

        var wasAlreadyAttached = positionReader.IsAttached && positionReader.AttachedProcessId == process.Id;
        if (positionReader.TryAttach(process, out var message))
        {
            if (!wasAlreadyAttached)
            {
                SetTrackingState("connected", T("已连接，等待角色坐标 · ", "Connected; waiting for player coordinates · ") + message);
            }
        }
        else
        {
            latestPosition = null;
            SetTrackingState("unsupported", message);
        }
    }

    private void ReadPlayerPosition()
    {
        if (!positionReader.IsAttached) return;
        if (!positionReader.TryReadPosition(out var position))
        {
            latestPosition = null;
            SetTrackingState("connected", T("游戏已连接，等待进入可操作地图", "Game connected; waiting to enter a playable map"));
            return;
        }

        latestPosition = position;
        SetTrackingState("tracking", T("实时定位已启用 · ", "Live tracking enabled · ") + positionReader.VersionName);
        PublishLatestPosition();
    }

    private void ReadAutoProgress()
    {
        if (!positionReader.IsAttached || !positionReader.TryReadAutoProgress(out var progress))
        {
            latestAutoProgress = null;
            return;
        }
        latestAutoProgress = progress;
        var signature = $"{progress.ProfileId}|{string.Join(',', progress.EnabledFlags)}";
        if (signature != autoProgressSignature)
        {
            autoProgressSignature = signature;
            TraceState(string.Format(
                T("自动识别：{0} 个已启用事件标志／{1} 个已读取标志", "Auto-detection: {0} enabled flags / {1} checked flags"),
                progress.EnabledFlags.Length,
                progress.CheckedFlags.Length));
        }
        PublishLatestAutoProgress();
    }

    private void SetTrackingState(string state, string message)
    {
        if (trackingState == state && trackingMessage == message) return;
        trackingState = state;
        trackingMessage = message;
        TraceState(T("坐标状态 ", "Tracking state ") + state + T("：", ": ") + message);
        PublishTrackingState();
    }

    private void PublishTrackingState()
    {
        PostPageMessage(new
        {
            action = "tracking-state",
            state = trackingState,
            message = trackingMessage
        });
    }

    private void PublishLatestPosition()
    {
        if (latestPosition is not { } position) return;
        PostPageMessage(new
        {
            action = "player-position",
            x = position.X,
            y = position.Y,
            z = position.Z,
            heading = position.Heading,
            cameraHeading = position.CameraHeading,
            mapId = position.MapId,
            version = positionReader.VersionName
        });
    }

    private void PublishLatestAutoProgress()
    {
        if (latestAutoProgress is not { } progress) return;
        PostPageMessage(new
        {
            action = "auto-progress",
            enabledFlags = progress.EnabledFlags,
            checkedFlags = progress.CheckedFlags,
            profileId = progress.ProfileId
        });
    }

    private void PollGamepad()
    {
        if (!gamepadReader.TryRead(out var state))
        {
            previousGamepadButtons = 0;
            gamepadChordLatched = false;
            touchpadToggleLatched = false;
            touchpadPressedSamples = 0;
            touchpadReleasedSamples = 0;
            if (gamepadMode) ExitGamepadMode(restoreGameFocus: true);
            return;
        }

        if (gamepadSource != state.Source)
        {
            gamepadSource = state.Source;
            TraceState(T("检测到手柄 · ", "Gamepad detected · ") + gamepadSource);
            if (gamepadMode) PublishGamepadMode();
        }
        var buttons = state.Buttons;
        var touchpadPressed = (buttons & GamepadReader.TouchpadToggle) != 0;
        if (touchpadPressed)
        {
            touchpadReleasedSamples = 0;
            touchpadPressedSamples = Math.Min(touchpadPressedSamples + 1, TouchpadPressSamples);
            if (!touchpadToggleLatched && touchpadPressedSamples >= TouchpadPressSamples)
            {
                // A click is consumed even when another app is in front. Requiring
                // a stable release before re-arming prevents HID report flicker
                // from expanding and restoring the window several times.
                touchpadToggleLatched = true;
                if (TryToggleExpandedMapWindowFromGamepad())
                {
                    previousGamepadButtons = buttons;
                    return;
                }
            }
        }
        else
        {
            touchpadPressedSamples = 0;
            if (touchpadToggleLatched)
            {
                touchpadReleasedSamples = Math.Min(touchpadReleasedSamples + 1, TouchpadReleaseSamples);
                if (touchpadReleasedSamples >= TouchpadReleaseSamples)
                {
                    touchpadToggleLatched = false;
                    touchpadReleasedSamples = 0;
                }
            }
            else
            {
                touchpadReleasedSamples = 0;
            }
        }

        var specialPressed = (buttons & GamepadReader.SpecialToggle) != 0;
        var specialWasPressed = (previousGamepadButtons & GamepadReader.SpecialToggle) != 0;
        var chordMask = (ushort)(GamepadReader.Back | GamepadReader.Start);
        var chordPressed = (buttons & chordMask) == chordMask;
        if (!chordPressed) gamepadChordLatched = false;

        if ((specialPressed && !specialWasPressed) || (chordPressed && !gamepadChordLatched))
        {
            gamepadChordLatched = true;
            if (gamepadMode) ExitGamepadMode(restoreGameFocus: true);
            else EnterGamepadMode();
            previousGamepadButtons = buttons;
            return;
        }

        if (!gamepadMode)
        {
            previousGamepadButtons = buttons;
            return;
        }

        var pressed = (ushort)(buttons & ~previousGamepadButtons);
        if ((pressed & GamepadReader.B) != 0)
        {
            ExitGamepadMode(restoreGameFocus: true);
            previousGamepadButtons = buttons;
            return;
        }

        if ((pressed & (GamepadReader.LeftShoulder | GamepadReader.DPadLeft)) != 0) CycleMap(-1);
        if ((pressed & (GamepadReader.RightShoulder | GamepadReader.DPadRight)) != 0) CycleMap(1);

        var hasAnalogInput = Math.Abs(state.LeftX) > 0.001f ||
            Math.Abs(state.LeftY) > 0.001f ||
            Math.Abs(state.RightX) > 0.001f ||
            Math.Abs(state.RightY) > 0.001f ||
            state.LeftTrigger > 0.001f ||
            state.RightTrigger > 0.001f;
        var hasPageButton = (pressed & (GamepadReader.A | GamepadReader.X | GamepadReader.Y |
            GamepadReader.LeftThumb | GamepadReader.RightThumb)) != 0;
        if (hasAnalogInput || hasPageButton)
        {
            PostPageMessage(new
            {
                action = "gamepad-input",
                leftX = state.LeftX,
                leftY = state.LeftY,
                rightX = state.RightX,
                rightY = state.RightY,
                leftTrigger = state.LeftTrigger,
                rightTrigger = state.RightTrigger,
                toggleFollow = (pressed & GamepadReader.A) != 0,
                toggleRoute = (pressed & GamepadReader.X) != 0,
                toggleItems = (pressed & GamepadReader.Y) != 0,
                toggleView = (pressed & GamepadReader.LeftThumb) != 0,
                reset = (pressed & GamepadReader.RightThumb) != 0
            });
        }

        previousGamepadButtons = buttons;
    }

    private void ToggleGamepadMode()
    {
        if (gamepadMode) ExitGamepadMode(restoreGameFocus: true);
        else EnterGamepadMode(allowFromTray: true);
    }

    private void EnterGamepadMode(bool allowFromTray = false)
    {
        var process = FindGameProcess();
        if (process is null || process.MainWindowHandle == IntPtr.Zero)
        {
            TraceState(T("手柄地图模式未进入：游戏窗口不存在", "Gamepad map mode not entered: game window not found"));
            return;
        }

        var foregroundRoot = NativeMethods.GetAncestor(NativeMethods.GetForegroundWindow(), 2);
        if (!allowFromTray && foregroundRoot != process.MainWindowHandle && foregroundRoot != Handle)
        {
            return;
        }

        gameWindowBeforeGamepadMode = process.MainWindowHandle;
        manuallyShown = true;
        manuallyHidden = false;
        ShowOverlay();
        NativeMethods.SetForegroundWindow(Handle);
        Activate();
        webView.Focus();

        var activeRoot = NativeMethods.GetAncestor(NativeMethods.GetForegroundWindow(), 2);
        if (activeRoot != Handle)
        {
            TraceState(T("手柄地图模式未进入：无法安全切换窗口焦点", "Gamepad map mode not entered: unable to switch focus safely"));
            trayIcon.ShowBalloonTip(
                1800,
                T("手柄地图模式", "Gamepad map mode"),
                T("请先单击地图窗口，再从托盘启用手柄模式。", "Click the map window first, then enable gamepad mode from the tray."),
                ToolTipIcon.Warning);
            return;
        }

        gamepadMode = true;
        if (gamepadModeMenuItem is not null) gamepadModeMenuItem.Checked = true;
        PublishGamepadMode();
        TraceState(T("已进入手柄地图模式 · ", "Entered gamepad map mode · ") + gamepadSource);
    }

    private void ExitGamepadMode(bool restoreGameFocus)
    {
        if (!gamepadMode) return;
        gamepadMode = false;
        if (gamepadModeMenuItem is not null) gamepadModeMenuItem.Checked = false;
        PublishGamepadMode();
        TraceState(T("已退出手柄地图模式", "Exited gamepad map mode"));

        var gameWindow = gameWindowBeforeGamepadMode;
        gameWindowBeforeGamepadMode = IntPtr.Zero;
        if (restoreGameFocus && gameWindow != IntPtr.Zero && NativeMethods.IsWindow(gameWindow))
        {
            NativeMethods.SetForegroundWindow(gameWindow);
        }
    }

    private void PublishGamepadMode()
    {
        PostPageMessage(new
        {
            action = "gamepad-mode",
            enabled = gamepadMode,
            source = gamepadSource
        });
    }

    private void PostPageMessage(object message)
    {
        if (!webReady || webView.CoreWebView2 is null) return;
        try
        {
            webView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(message));
        }
        catch (Exception exception)
        {
            TraceState(T("向地图发送实时数据失败：", "Failed to send live data to the map: ") + exception.Message);
        }
    }

    private static Process? FindGameProcess()
    {
        return Process.GetProcessesByName("DarkSoulsRemastered").FirstOrDefault();
    }

    private void MoveToGameScreenIfNeeded(Process process)
    {
        if (settings.HasSavedBounds || process.MainWindowHandle == IntPtr.Zero) return;
        var workingArea = Screen.FromHandle(process.MainWindowHandle).WorkingArea;
        Location = GetCompactBounds(workingArea).Location;
    }

    private void ToggleVisibility()
    {
        if (Visible)
        {
            HideManually();
        }
        else
        {
            manuallyShown = true;
            manuallyHidden = false;
            ShowOverlay();
        }
    }

    private void HideManually()
    {
        if (gamepadMode) ExitGamepadMode(restoreGameFocus: true);
        manuallyHidden = true;
        manuallyShown = false;
        Hide();
    }

    private void ShowOverlay()
    {
        var wasVisible = Visible;
        if (!wasVisible) Show();
        TopMost = true;
        Opacity = desiredOpacity;
        if (!wasVisible)
        {
            TraceState(english
                ? $"Window shown Visible={Visible} Opacity={Opacity:0.00}"
                : $"显示窗口 Visible={Visible} Opacity={Opacity:0.00}");
        }
    }

    private bool TryToggleExpandedMapWindowFromGamepad()
    {
        using var process = FindGameProcess();
        if (process is null || process.MainWindowHandle == IntPtr.Zero) return false;
        var foregroundRoot = NativeMethods.GetAncestor(NativeMethods.GetForegroundWindow(), 2);
        if (foregroundRoot != process.MainWindowHandle && foregroundRoot != Handle) return false;
        ToggleExpandedMapWindow(process);
        return true;
    }

    private void ToggleExpandedMapWindow(Process? process = null)
    {
        if (mapWindowExpanded || WindowState == FormWindowState.Maximized)
        {
            RestoreCompactWindow();
            return;
        }

        var workingArea = process is not null && process.MainWindowHandle != IntPtr.Zero
            ? Screen.FromHandle(process.MainWindowHandle).WorkingArea
            : GetPreferredWorkingArea();
        manuallyShown = true;
        manuallyHidden = false;
        ShowOverlay();
        suppressBoundsSave = true;
        try
        {
            WindowState = FormWindowState.Normal;
            Bounds = workingArea;
            WindowState = FormWindowState.Maximized;
        }
        finally
        {
            suppressBoundsSave = false;
        }
        mapWindowExpanded = true;
        PublishWindowMode();
        TraceState(T("地图已放大到整个窗口", "Map expanded to fill the window"));
    }

    private void RestoreCompactWindow()
    {
        var process = FindGameProcess();
        var workingArea = process is not null && process.MainWindowHandle != IntPtr.Zero
            ? Screen.FromHandle(process.MainWindowHandle).WorkingArea
            : Screen.PrimaryScreen?.WorkingArea ?? Screen.FromControl(this).WorkingArea;

        mapWindowExpanded = false;
        suppressBoundsSave = true;
        try
        {
            WindowState = FormWindowState.Normal;
            Bounds = GetCompactBounds(workingArea);
        }
        finally
        {
            suppressBoundsSave = false;
        }
        settings.X = Bounds.X;
        settings.Y = Bounds.Y;
        settings.Width = Bounds.Width;
        settings.Height = Bounds.Height;
        settings.HasSavedBounds = true;
        manuallyShown = true;
        manuallyHidden = false;
        ShowOverlay();
        PublishWindowMode();
        SaveSettings();
        TraceState(T("已恢复右上角小窗", "Compact top-right window restored"));
    }

    private void PublishWindowMode()
    {
        PostPageMessage(new
        {
            action = "window-mode",
            expanded = mapWindowExpanded
        });
    }

    private void ToggleLock()
    {
        ApplyLockState(!settings.Locked, save: true);
    }

    private void ApplyLockState(bool locked, bool save)
    {
        var oldBounds = Bounds;
        settings.Locked = locked;
        FormBorderStyle = locked ? FormBorderStyle.None : FormBorderStyle.Sizable;
        Bounds = oldBounds;

        var exStyle = NativeMethods.GetWindowLongPtr(Handle, GwlExStyle).ToInt64();
        if (locked) exStyle |= WsExTransparent;
        else exStyle &= ~WsExTransparent;
        NativeMethods.SetWindowLongPtr(Handle, GwlExStyle, new IntPtr(exStyle));

        if (lockMenuItem is not null) lockMenuItem.Checked = locked;
        SyncLockStateToWeb();
        if (save) SaveSettings();
    }

    private async void SyncLockStateToWeb()
    {
        if (!webReady) return;
        try
        {
            await webView.ExecuteScriptAsync($"window.dsrOverlay && window.dsrOverlay.setHostLocked({settings.Locked.ToString().ToLowerInvariant()})");
        }
        catch
        {
            // The page may be navigating; the navigation callback will retry.
        }
    }

    private async void CycleMap(int delta)
    {
        if (!webReady) return;
        try
        {
            await webView.ExecuteScriptAsync($"window.dsrOverlay && window.dsrOverlay.cycleMap({delta})");
            TraceState(delta < 0
                ? T("快捷键切换到上一张地图", "Hotkey switched to the previous map")
                : T("快捷键切换到下一张地图", "Hotkey switched to the next map"));
        }
        catch (Exception exception)
        {
            TraceState(T("切换地图失败：", "Failed to switch maps: ") + exception.Message);
        }
    }

    private void SaveBoundsIfAppropriate()
    {
        if (!Visible || WindowState != FormWindowState.Normal || exiting || suppressBoundsSave) return;
        settings.X = Bounds.X;
        settings.Y = Bounds.Y;
        settings.Width = Bounds.Width;
        settings.Height = Bounds.Height;
        settings.HasSavedBounds = true;
    }

    private Rectangle GetSafeBounds(OverlaySettings value)
    {
        if (!value.HasSavedBounds)
        {
            return GetCompactBounds(GetPreferredWorkingArea());
        }

        var candidate = new Rectangle(value.X, value.Y, Math.Max(420, value.Width), Math.Max(300, value.Height));
        var visible = Screen.AllScreens.Any(screen => Rectangle.Intersect(screen.WorkingArea, candidate).Width >= 100);
        return visible ? candidate : GetCompactBounds(GetPreferredWorkingArea());
    }

    private static Rectangle GetCompactBounds(Rectangle workingArea)
    {
        const int margin = 12;
        const int compactWidth = 560;
        const int compactHeight = 400;
        var width = Math.Min(compactWidth, Math.Max(420, workingArea.Width - margin * 2));
        var height = Math.Min(compactHeight, Math.Max(300, workingArea.Height - margin * 2));
        return new Rectangle(workingArea.Right - width - margin, workingArea.Top + margin, width, height);
    }

    private static Rectangle GetPreferredWorkingArea()
    {
        using var process = FindGameProcess();
        if (process is not null && process.MainWindowHandle != IntPtr.Zero)
        {
            return Screen.FromHandle(process.MainWindowHandle).WorkingArea;
        }
        return Screen.PrimaryScreen?.WorkingArea ?? new Rectangle(0, 0, 1920, 1080);
    }

    private OverlaySettings LoadSettings()
    {
        try
        {
            if (File.Exists(settingsPath))
            {
                return JsonSerializer.Deserialize<OverlaySettings>(File.ReadAllText(settingsPath)) ?? new OverlaySettings();
            }
        }
        catch
        {
            // Fall back to defaults if the settings file is unavailable.
        }
        return new OverlaySettings();
    }

    private void SaveSettings()
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(settingsPath)!);
            File.WriteAllText(settingsPath, JsonSerializer.Serialize(settings, new JsonSerializerOptions { WriteIndented = true }));
        }
        catch
        {
            // Settings are optional; the overlay can continue without persistence.
        }
    }

    private void TraceState(string message)
    {
        try
        {
            var folder = Path.GetDirectoryName(settingsPath);
            if (string.IsNullOrWhiteSpace(folder)) return;
            Directory.CreateDirectory(folder);
            File.AppendAllText(Path.Combine(folder, "overlay.log"), $"{DateTime.Now:O} {message}{Environment.NewLine}");
        }
        catch
        {
            // Diagnostics must never interfere with the overlay.
        }
    }

    private void OnFormClosing(object? sender, FormClosingEventArgs e)
    {
        if (!exiting && e.CloseReason == CloseReason.UserClosing)
        {
            e.Cancel = true;
            HideManually();
            return;
        }
        SaveBoundsIfAppropriate();
        SaveSettings();
    }

    private void ExitApplication()
    {
        exiting = true;
        gameTimer.Stop();
        positionTimer.Stop();
        progressTimer.Stop();
        gamepadTimer.Stop();
        positionReader.Dispose();
        trayIcon.Visible = false;
        trayIcon.Dispose();
        Close();
    }

    private sealed class OverlaySettings
    {
        public int X { get; set; } = 12;
        public int Y { get; set; } = 12;
        public int Width { get; set; } = 560;
        public int Height { get; set; } = 400;
        public double Opacity { get; set; } = 0.85;
        public bool OnlyWhenGameRunning { get; set; } = true;
        public bool Locked { get; set; }
        public bool HasSavedBounds { get; set; }
        public bool AutoBorderlessFullscreen { get; set; } = false;
        public string Language { get; set; } = "zh-CN";
    }

    private static class NativeMethods
    {
        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool UnregisterHotKey(IntPtr hWnd, int id);

        [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")]
        public static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW")]
        public static extern IntPtr SetWindowLongPtr(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        public static extern IntPtr GetAncestor(IntPtr hWnd, uint flags);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool IsWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool IsIconic(IntPtr hWnd);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool GetWindowRect(IntPtr hWnd, out NativeRect rect);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool SetWindowPos(
            IntPtr hWnd,
            IntPtr hWndInsertAfter,
            int x,
            int y,
            int width,
            int height,
            uint flags);
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct NativeRect
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
