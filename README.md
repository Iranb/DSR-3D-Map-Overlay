# 黑暗之魂重制版 3D 悬浮地图

适用于 Windows 的《DARK SOULS REMASTERED》三维地图工具。可在游戏旁显示角色位置、朝向、收集目标与探索路线，支持本体及 DLC 的 18 个区域视图。

## 下载使用

从 [Releases](../../releases) 下载 Windows x64 压缩包，完整解压后运行：

- **预览悬浮地图.bat**：立即打开地图，可离线查看。
- **启动悬浮地图.bat**：启动地图程序，等待游戏进入可操作状态后显示。

发布包包含 .NET 运行时；电脑还需安装 [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)。游戏建议使用窗口或无边框模式。

“随游戏显示”需要地图程序已启动。个人电脑上的 Steam 联动任务不包含在通用发布包内；可先启动地图，再从 Steam 启动游戏。

## 已实现的功能

- 只读获取角色位置、朝向、区域与拾取事件，自动切换所在区域。
- 默认保留 307 个收集与探索目标：76 个重要道具/防具、63 个武器/盾牌、21 个戒指、14 个法术、44 个篝火、72 个 NPC 候选位置、17 个隐藏入口。
- 普通魂块、人性、药品、箭矢和常见强化材料已隐藏；钥匙、余烬、火防女灵魂、原盘和特殊工具保留。
- 固定拾取和部分隐藏入口自动识别；手动完成记录按存档槽隔离保存。
- 69 段区域探索步骤，以及逐点扫图、暂跳、重新排序和全程线预览。
- 大窗/小窗、视角跟随、楼层遮挡处理、透明度、鼠标穿透和手柄控制。

NPC 标记代表不同剧情阶段的候选位置，不判断当前在场状态。篝火点燃、NPC 交谈与部分入口需手动记录。路线依据几何网格计算，不能判断门锁、升降梯、跳跃与剧情机关；不连通的路径会留空提示。数据不覆盖全部商店、随机掉落及剧情奖励。

## 常用操作

| 操作 | 功能 |
|---|---|
| 左键拖动 / 右键拖动 / 滚轮 | 旋转 / 平移 / 缩放 |
| Ctrl+Alt+M | 显示或隐藏地图 |
| Ctrl+Alt+F | 大窗与小窗切换 |
| Ctrl+Alt+L | 鼠标穿透 |
| Ctrl+Alt+左右键 | 手动切换区域 |
| 点击收集清单 | 导航到目标 |
| Shift+点击收集清单 | 手动切换完成状态 |
| 人 / 秘 | NPC / 隐藏入口图层 |
| 路线 → 开始扫图 | 逐点探索当前区域 |

手动切图会暂停自动区域跟随，点击“手动区域”恢复。设置和完成记录位于当前用户的本地应用数据目录，工具不修改游戏文件或存档。

## 从源码构建

需要 Windows、.NET 10 SDK 和 WebView2 Runtime。在项目根目录执行：

```powershell
dotnet publish overlay-app/DSRMapOverlay.csproj -c Release -r win-x64 --self-contained true -o publish
```

生成可分发 ZIP：

```powershell
pwsh -File tools/package-release.ps1 -Version 1.0.0
```

## 开发验证与数据生成

无需运行游戏的事件标志检查：

```powershell
dotnet run --project tools/ReaderCheck/ReaderCheck.csproj
```

添加本机游戏可执行文件路径，可检查版本特征；游戏正在运行时还会只读检查实时位置与事件。

```powershell
dotnet run --project tools/ReaderCheck/ReaderCheck.csproj -- --game-exe "你的游戏目录/DarkSoulsRemastered.exe"
```

安装 Python 的 Playwright 包和 Microsoft Edge 后，可运行已有的 18 区域页面检查：

```powershell
python tools/verify_exploration.py
```

日常构建使用已生成的数据。重新提取需要本机游戏文件和 [Paramdex](https://github.com/soulsmods/Paramdex) 的 DS1R/Defs 目录：

```powershell
dotnet run --project tools/Extract/Extract.csproj -- "你的游戏目录" "Paramdex/DS1R/Defs" "tools/game-data.json"
python tools/build-dsr-markers.py
```

原始提取文件、实机位置样本、个人完成记录和构建缓存不纳入版本管理。使用与验证细节见 [使用说明](使用说明.md) 和 [功能对齐检查](功能对齐检查.md)。

## 来源与许可

查看器基于 [colevk/dark-souls-map-viewer](https://github.com/colevk/dark-souls-map-viewer)。界面与桌面宿主采用仓库根目录的 MIT 许可；独立的离线提取工具及其 SoulsFormats 依赖采用 GPL-3.0，未链接到地图桌面程序。第三方代码、运行时与游戏内容的权利归各自所有者，详情见 [第三方说明](THIRD_PARTY_NOTICES.md)。

本项目为非官方爱好者工具，与 FromSoftware、Bandai Namco Entertainment 无隶属关系。
