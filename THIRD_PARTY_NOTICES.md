# Third-party notices

This project includes or derives from the following open-source work:

- [colevk/dark-souls-map-viewer](https://github.com/colevk/dark-souls-map-viewer), Copyright (c) 2014-2016 Cole van Krieken, MIT License. The original viewer, rendering code and `.iv` collision-map files are used as the base of this project.
- [Three.js r73](https://github.com/mrdoob/three.js), MIT License.
- [jQuery 2.1.4](https://github.com/jquery/jquery), MIT License.
- [Underscore.js 1.8.3](https://github.com/jashkenas/underscore), MIT License.
- [ResizeSensor.js 0.3.0](https://github.com/marcj/css-element-queries), MIT License.
- [Microsoft WebView2](https://www.nuget.org/packages/Microsoft.Web.WebView2), distributed under Microsoft's package license.

Route and compatibility research also references public data from:

- [rythin-sr/ASL-Scripts](https://github.com/rythin-sr/ASL-Scripts/blob/master/DarkSoulsII.asl)
- [borgCode/SilkySouls2](https://github.com/borgCode/SilkySouls2)
- [Rejna/dark-souls-2-sotfs-cheat-sheet](https://github.com/Rejna/dark-souls-2-sotfs-cheat-sheet)

DSR adaptation references:

- [SoulSplitter](https://github.com/FrankvdStam/SoulSplitter): read-only WorldChrMan/GameMan/event flag signatures.
- [Soulstruct](https://github.com/Grimrukh/soulstruct): DS1 event flag address/bit layout. Its fixed current-map address was not used after live validation failed.
- [DSR-Gadget-Local-Loader](https://github.com/Despair64/DSR-Gadget-Local-Loader/blob/master/DSR-Gadget/Util/DSROffsets.cs): PlayerIns.AreaID at 0x358; validated against the local game's Undead Burg subarea.
- [soulstruct-vanilla](https://github.com/Grimrukh/soulstruct-vanilla): event and NPC semantic references, read as text only.
- [SoulsFormats](https://github.com/JKAnderson/SoulsFormats), GPL-3.0: the source subset under tools/SoulsFormats is used only by the separate offline extractor under tools/Extract. Both directories carry the GPL license; local changes are listed in tools/SoulsFormats/NOTICE.md. Neither component is linked into the desktop overlay or included in the Windows runtime package.
- [Paramdex](https://github.com/soulsmods/Paramdex): external schema input for the optional extractor; not bundled in this repository.
- [Dark Souls EMEDF](https://soulsmods.github.io/emedf/ds1-emedf.html): instruction argument definitions.

Markers are generated from the user's installed game; candidate NPC locations do not assert live NPC presence. Route instructions are authored for this local tool.

Redistributed JavaScript license texts and runtime notices are included under licenses/. Windows self-contained releases also include Microsoft .NET runtime components under their upstream licenses. The root MIT license does not replace third-party licenses.

Dark Souls and related game content are property of their respective rights holders. This fan project is not affiliated with or endorsed by FromSoftware or Bandai Namco Entertainment.
