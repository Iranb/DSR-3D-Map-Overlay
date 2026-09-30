(function () {
  "use strict";

  var requestedLanguage = new URLSearchParams(window.location.search).get("lang") || "zh-CN";
  var english = requestedLanguage.toLowerCase().indexOf("en") === 0;
  var locale = null;
  var ui = locale ? locale.ui : {};

  function tr(key, fallback) {
    return ui[key] || fallback;
  }

  function trDistance(templateKey, fallback, distance) {
    return tr(templateKey, fallback).replace("{distance}", String(distance));
  }

  var namesZh = ["亚诺尔隆德", "灰烬湖", "病村／克拉格的住处", "地下墓地", "黑森林庭院／夹缝森林", "恶魔遗迹／废都伊扎里斯", "底层", "公爵书库／结晶洞穴", "传火祭祀场", "初始火炉", "小隆德遗迹／飞龙之谷", "乌拉席露（DLC）", "乌拉席露竞技场", "艾雷米雅斯的绘画世界", "塞恩古城", "巨人墓地", "北方不死院", "城外不死镇／不死教区"];
  var recommendedRoute = [{"source": 16, "label": "01 · 北方不死院"}, {"source": 8, "label": "02 · 传火祭祀场"}, {"source": 17, "label": "03 · 城外不死镇／不死教区"}, {"source": 6, "label": "04 · 底层"}, {"source": 2, "label": "05 · 病村／克拉格的住处"}, {"source": 4, "label": "06 · 黑森林庭院／夹缝森林"}, {"source": 14, "label": "07 · 塞恩古城"}, {"source": 0, "label": "08 · 亚诺尔隆德"}, {"source": 13, "label": "09 · 艾雷米雅斯的绘画世界"}, {"source": 10, "label": "10 · 小隆德遗迹／飞龙之谷"}, {"source": 3, "label": "11 · 地下墓地"}, {"source": 15, "label": "12 · 巨人墓地"}, {"source": 7, "label": "13 · 公爵书库／结晶洞穴"}, {"source": 5, "label": "14 · 恶魔遗迹／废都伊扎里斯"}, {"source": 1, "label": "15 · 灰烬湖"}, {"source": 11, "label": "16 · 乌拉席露（DLC）"}, {"source": 9, "label": "17 · 初始火炉"}, {"source": 12, "label": "18 · 乌拉席露竞技场"}];
  var explorationRoutes = {}, importantOwnershipTargets = {}, mapIdToRouteIndex = {};
  Object.keys(window.DSRExploration.mapIds).forEach(function(id) {
    mapIdToRouteIndex[id] = recommendedRoute.findIndex(function(r){return r.source === window.DSRExploration.mapIds[id];});
  });
  var autoRegion = localStorage.getItem("dsr-auto-region") !== "false";
  var regionCandidate = null, regionSamples = 0;
  var tourRunning = false, tourOrder = {}, tourSkipped = {};
  var tourPreview = false, tourDisconnected = 0;
  var currentProfile = "manual";
  var lastFlagSignature = "", lastFlagSnapshotAt = 0;
  var importantItems = {"16": {"title": "北方不死院 · 探索清单", "items": [{"id": "dsr-16-0", "name": "取得原素瓶与钥匙", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-16-1", "name": "击败不死院恶魔，前往传火祭祀场", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "8": {"title": "传火祭祀场 · 探索清单", "items": [{"id": "dsr-8-0", "name": "与祭祀场 NPC 对话", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-8-1", "name": "从水道通往不死镇；地下道路通往小隆德", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "17": {"title": "城外不死镇／不死教区 · 探索清单", "items": [{"id": "dsr-17-0", "name": "探索不死镇与教区，打开回祭祀场升降梯", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-17-1", "name": "石像鬼后敲响第一口钟", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-17-2", "name": "从下层不死镇进入底层", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "6": {"title": "底层 · 探索清单", "items": [{"id": "dsr-6-0", "name": "探索下水道并开启捷径", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-6-1", "name": "击败贪食魔龙，取得病村钥匙", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "2": {"title": "病村／克拉格的住处 · 探索清单", "items": [{"id": "dsr-2-0", "name": "下降到沼泽，留意中毒与高低层", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-2-1", "name": "克拉格后敲响第二口钟", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "4": {"title": "黑森林庭院／夹缝森林 · 探索清单", "items": [{"id": "dsr-4-0", "name": "月光蝶、希夫与九头蛇分支", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-4-1", "name": "希夫掉落亚尔特留斯的契约；四王战需要", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "14": {"title": "塞恩古城 · 探索清单", "items": [{"id": "dsr-14-0", "name": "两口钟后进入古城", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-14-1", "name": "通过机关到达屋顶，击败钢铁巨偶", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "0": {"title": "亚诺尔隆德 · 探索清单", "items": [{"id": "dsr-0-0", "name": "探索教堂与旋转阶梯", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-0-1", "name": "击败翁斯坦与斯摩，取得王器", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "13": {"title": "艾雷米雅斯的绘画世界 · 探索清单", "items": [{"id": "dsr-13-0", "name": "从亚诺尔隆德绘画进入；需要奇异人偶", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-13-1", "name": "普莉希拉可选择不交战", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "10": {"title": "小隆德遗迹／飞龙之谷 · 探索清单", "items": [{"id": "dsr-10-0", "name": "向英果德取得封印钥匙并排水", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-10-1", "name": "佩戴亚尔特留斯的契约进入深渊", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "3": {"title": "地下墓地 · 探索清单", "items": [{"id": "dsr-3-0", "name": "留意死灵法师与复活骷髅", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-3-1", "name": "三贴家族后进入巨人墓地", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "15": {"title": "巨人墓地 · 探索清单", "items": [{"id": "dsr-15-0", "name": "准备照明，探索巨人墓地", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-15-1", "name": "取得王器并解除封印后挑战墓王尼特", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "7": {"title": "公爵书库／结晶洞穴 · 探索清单", "items": [{"id": "dsr-7-0", "name": "探索书库，逃离监牢", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-7-1", "name": "结晶洞穴留意隐形道路；挑战白龙希斯", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "5": {"title": "恶魔遗迹／废都伊扎里斯 · 探索清单", "items": [{"id": "dsr-5-0", "name": "探索恶魔遗迹到废都", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-5-1", "name": "留意岩浆区域与混沌温床路线", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "1": {"title": "灰烬湖 · 探索清单", "items": [{"id": "dsr-1-0", "name": "经大树洞向下抵达灰烬湖", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-1-1", "name": "石之古龙契约为可选分支", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "11": {"title": "乌拉席露（DLC） · 探索清单", "items": [{"id": "dsr-11-0", "name": "救出幽暗并取得破损项链后进入 DLC", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-11-1", "name": "阿尔特留斯、马努斯、黑龙喀拉弥特分支", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "9": {"title": "初始火炉 · 探索清单", "items": [{"id": "dsr-9-0", "name": "集齐四份王魂／王魂碎片并献给王器", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}, {"id": "dsr-9-1", "name": "最终战前处理尚未完成的探索", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}, "12": {"title": "乌拉席露竞技场 · 探索清单", "items": [{"id": "dsr-12-0", "name": "DLC 的可选竞技场区域", "type": "区域指引", "precision": "area", "note": "手动完成记录，不代表精确坐标。"}]}};
  var viewport = document.getElementById("viewport");
  var status = document.getElementById("status");
  var mapSelect = document.getElementById("mapSelect");
  var compactButton = document.getElementById("compactButton");
  var resetButton = document.getElementById("resetButton");
  var edgeButton = document.getElementById("edgeButton");
  var routeButton = document.getElementById("routeButton");
  var itemButton = document.getElementById("itemButton");
  var bonfireButton = document.getElementById("bonfireButton");
  var weaponButton = document.getElementById("weaponButton");
  var ringButton = document.getElementById("ringButton");
  var spellButton = document.getElementById("spellButton");
  var npcButton = document.getElementById("npcButton");
  var secretButton = document.getElementById("secretButton");
  var followButton = document.getElementById("followButton");
  var viewButton = document.getElementById("viewButton");
  var interiorButton = document.getElementById("interiorButton");
  var languageButton = document.getElementById("languageButton");
  var lockButton = document.getElementById("lockButton");
  var hideButton = document.getElementById("hideButton");
  var routePanel = document.getElementById("routePanel");
  var itemPanel = document.getElementById("itemPanel");
  var playerStatus = document.getElementById("playerStatus");
  var gamepadStatus = document.getElementById("gamepadStatus");

  if (locale) {
    document.documentElement.lang = "en";
    document.title = tr("documentTitle", "DSR 3D Map");
    viewport.setAttribute("aria-label", tr("viewportLabel", "3D map view"));
    document.querySelector(".brand").textContent = tr("brand", "DSR 3D Map");
    mapSelect.setAttribute("aria-label", tr("mapSelectLabel", "Select map"));
    [
      [compactButton, "compact", "compactTitle"],
      [resetButton, "reset", "resetTitle"],
      [edgeButton, "edges", "edgesTitle"],
      [routeButton, "route", "routeTitle"],
      [itemButton, "items", "itemsTitle"],
      [bonfireButton, "bonfires", "bonfiresTitle"],
      [weaponButton, "weapons", "weaponsTitle"],
      [ringButton, "rings", "ringsTitle"],
      [spellButton, "spells", "spellsTitle"],
      [npcButton, "npcs", "npcsTitle"],
      [secretButton, "secrets", "secretsTitle"],
      [followButton, "follow", "followTitle"],
      [viewButton, "view", "viewTitle"],
      [interiorButton, "interior", "interiorTitle"],
      [languageButton, "language", "languageTitle"],
      [lockButton, "lock", "lockTitle"],
      [hideButton, "hide", "hideTitle"]
    ].forEach(function (buttonInfo) {
      buttonInfo[0].textContent = tr(buttonInfo[1], buttonInfo[0].textContent);
      buttonInfo[0].title = tr(buttonInfo[2], buttonInfo[0].title);
    });
    routePanel.setAttribute("aria-label", tr("routePanelLabel", "Exploration route landmarks"));
    itemPanel.setAttribute("aria-label", tr("pickupPanelLabel", "Collection, bonfire, weapon, ring, spell, NPC and hidden-passage markers"));
    gamepadStatus.textContent = tr("gamepadStatus", "Gamepad map mode");
    playerStatus.textContent = tr("playerWaiting", "Live tracking: waiting for the game");
    status.textContent = tr("initializing", "Initializing…");
    document.getElementById("hint").textContent = tr("hint", "Left-drag: rotate · Right-drag: pan · Wheel: zoom · Double-click: reset");
  }

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x070a0f, 1);
  viewport.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100000);
  var material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    derivatives: true,
    lights: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.lights,
      BigShader.uniforms
    ]),
    vertexShader: BigShader.vertexShader,
    fragmentShader: BigShader.fragmentShader
  });
  material.uniforms.edgeHighlight.value = 1;
  material.uniforms.edgeAttenuation.value = 1;
  material.uniforms.wrapAround.value = 1;
  material.uniforms.edgeColor.value = new THREE.Color(0x111722);

  scene.add(new THREE.AmbientLight(0x34445b));
  var light = new THREE.DirectionalLight(0xe6d4ad, 1.15);
  light.position.set(1, 2, 3);
  scene.add(light);

  var meshes = [];
  var routeGroup = null;
  var routeSegments = [];
  var routeGuideLine = null;
  var routeGuideStatus = null;
  var routePointRows = [];
  var navigationGraph = null;
  var itemGroup = null;
  var keyItemGroup = null;
  var bonfireGroup = null;
  var weaponGroup = null;
  var ringGroup = null;
  var spellGroup = null;
  var npcGroup = null;
  var secretGroup = null;
  var collectibleRouteGroup = null;
  var collectibleRouteTarget = null;
  var collectibleRoutePath = [];
  var collectibleRouteStart = null;
  var collectibleRows = [];
  var collectibleStateStorageKey = "dsr-collected-v2-manual";
  var autoCollectibleStateStorageKey = "dsr-overlay-auto-collected-v1";
  var manualIncompleteStorageKey = "dsr-ignore-v2-manual";
  var completedCollectibles = loadCollectibleState(collectibleStateStorageKey);
  var autoCompletedCollectibles = {};
  var manualIncompleteCollectibles = loadCollectibleState(manualIncompleteStorageKey);
  var autoProgressAvailable = false;
  var autoProgressItemCount = 0;
  var autoProgressBonfireCount = 0;
  var acquiredItemIdsStorageKey = "dsr-overlay-acquired-item-ids-v1";
  var acquiredItemIds = loadCollectibleState(acquiredItemIdsStorageKey);

  var lastCollectibleDistanceUpdate = 0;
  var playerGroup = null;
  var playerMarker = null;
  var playerDirectionMarker = null;
  var playerMarkerBaseSize = 8;
  var playerHeading = null;
  var headingProjectionStart = new THREE.Vector4();
  var headingProjectionEnd = new THREE.Vector4();
  var gameCameraHeading = null;
  var followGameView = localStorage.getItem("dsr-overlay-view-follow") !== "false";
  var gameViewInitialized = false;
  var cameraRaycaster = new THREE.Raycaster();
  var cameraRayDirection = new THREE.Vector3();
  var cameraCandidatePosition = new THREE.Vector3();
  var cameraResolvedPosition = new THREE.Vector3();
  var cameraViewDirection = new THREE.Vector3();
  var cameraDesiredScreenUp = new THREE.Vector3();
  var cameraHeadingForward = new THREE.Vector3();
  var cameraAvoidanceIndex = 0;
  var cameraAvoidanceDistance = null;
  var cameraAvoidanceActive = false;
  var cameraLineOfSightClear = true;
  var cameraLastOcclusionCheck = 0;
  var cameraThetaAtOcclusionCheck = null;
  var cameraActualTheta = -0.75;
  var cameraActualPhi = 1.05;
  var indoorCutEnabled = localStorage.getItem("dsr-overlay-indoor-cut") !== "false";
  var indoorCutActive = false;
  var indoorCutEvidence = 0;
  var indoorLastCheck = 0;
  var indoorCeilingDistance = null;
  var indoorCutClearance = 4;
  var indoorCutHeight = 100000;
  var indoorCutRadius = 0;
  var indoorRaycaster = new THREE.Raycaster();
  var indoorRayOrigin = new THREE.Vector3();
  var indoorRayDirection = new THREE.Vector3(0, 1, 0);
  var indoorRayOffsets = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1)
  ];
  var routeVisible = localStorage.getItem("dsr-overlay-route-visible") !== "false";
  var itemVisible = localStorage.getItem("dsr-overlay-item-visible") !== "false";
  var bonfireVisible = localStorage.getItem("dsr-overlay-bonfire-visible") !== "false";
  var weaponVisible = localStorage.getItem("dsr-overlay-weapon-visible") !== "false";
  var ringVisible = localStorage.getItem("dsr-overlay-ring-visible") !== "false";
  var spellVisible = localStorage.getItem("dsr-overlay-spell-visible") !== "false";
  var npcVisible = localStorage.getItem("dsr-overlay-npc-visible") !== "false";
  var secretVisible = localStorage.getItem("dsr-overlay-secret-visible") !== "false";
  var followPlayer = localStorage.getItem("dsr-overlay-follow-player") !== "false";
  var lastPlayerMessage = null;
  var lastPlayerMapPosition = null;
  var playerOnCurrentMap = false;
  var followRadiusInitialized = false;
  var currentRouteIndex = 0;
  var loadToken = 0;
  var bounds = new THREE.Box3();
  var target = new THREE.Vector3();
  var radius = 100;
  var theta = -0.75;
  var phi = 1.05;
  var dragMode = 0;
  var lastX = 0;
  var lastY = 0;
  var gamepadMode = false;
  var hostWindowExpanded = false;
  var compactRadiusBeforeExpansion = null;
  var compactMapFramedBeforeExpansion = false;
  var expandedRangeScale = 1.75;
  var mapViewFramed = false;
  var mapOverviewRadius = 100;
  var mapFraming = null;

  function postHost(action, details) {
    if (window.chrome && window.chrome.webview) {
      var message = details || {};
      message.action = action;
      window.chrome.webview.postMessage(message);
    }
  }

  function setStatus(text) {
    status.textContent = text;
  }

  function resize() {
    var width = Math.max(1, viewport.clientWidth);
    var height = Math.max(1, viewport.clientHeight);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (mapViewFramed && meshes.length) fitCurrentMap();
  }

  function updateCollectionLayout() {
    var visible = itemPanel.childElementCount > 0 && itemPanel.style.display !== "none" &&
      !document.body.classList.contains("host-locked");
    document.body.classList.toggle("has-item-sidebar", hostWindowExpanded && visible);
    resize();
  }

  function normalizeRadians(value) {
    var twoPi = Math.PI * 2;
    return ((value + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  }

  function shortestAngleDelta(from, to) {
    return normalizeRadians(to - from);
  }

  function applyIndoorCutUniforms() {
    var active = !!(indoorCutEnabled && indoorCutActive && lastPlayerMapPosition);
    material.uniforms.indoorCut.value = active ? 1 : 0;
    material.uniforms.indoorCutHeight.value = indoorCutHeight;
    material.uniforms.indoorCutCenter.value.set(
      lastPlayerMapPosition ? lastPlayerMapPosition.x : 0,
      lastPlayerMapPosition ? lastPlayerMapPosition.z : 0
    );
    material.uniforms.indoorCutRadius.value = indoorCutRadius;
    interiorButton.classList.toggle("active", indoorCutEnabled);
    interiorButton.classList.toggle("cutting", active);
    updateIndoorMarkerVisibility();
  }

  function indoorFloorOpacity(height) {
    if (!indoorCutActive || !lastPlayerMapPosition || !Number.isFinite(height)) return 1;
    var difference = Math.abs(height - lastPlayerMapPosition.y);
    if (difference <= 6) return 1;
    if (difference >= 15) return 0.14;
    return 1 - (difference - 6) / 9 * 0.86;
  }

  function stackedFloorOpacity(object) {
    if (!lastPlayerMapPosition || !object || !object.userData ||
        !Number.isFinite(object.userData.mapHeight) ||
        !Number.isFinite(object.userData.mapX) || !Number.isFinite(object.userData.mapZ)) return 1;
    var horizontal = Math.hypot(
      object.userData.mapX - lastPlayerMapPosition.x,
      object.userData.mapZ - lastPlayerMapPosition.z
    );
    var vertical = Math.abs(object.userData.mapHeight - lastPlayerMapPosition.y);
    if (horizontal > 35 || vertical <= 5) return 1;
    if (vertical >= 10) return 0.18;
    return 1 - (vertical - 5) / 5 * 0.82;
  }

  function updateIndoorMarkerVisibility() {
    [routeGroup, collectibleRouteGroup, itemGroup, keyItemGroup, bonfireGroup, weaponGroup, ringGroup, spellGroup, npcGroup, secretGroup].forEach(function (group) {
      if (!group) return;
      group.traverse(function (object) {
        if (!object.userData || !object.userData.floorAware || !object.material) return;
        var completedFactor = object.userData.collectibleCompleted ? 0.42 : 1;
        object.material.opacity = Math.min(
          indoorFloorOpacity(object.userData.mapHeight),
          stackedFloorOpacity(object)
        ) * completedFactor;
        if (Number.isFinite(object.userData.baseSize)) {
          var scale = object.userData.baseSize * (indoorCutActive ? 0.66 : 1) *
            (object.userData.collectibleCompleted ? 0.82 : 1);
          object.scale.set(scale, scale, 1);
        }
      });
    });
  }

  function floorAwarenessDiagnostics() {
    var markers = 0;
    var fadedMarkers = 0;
    [routeGroup, collectibleRouteGroup, itemGroup, keyItemGroup, bonfireGroup, weaponGroup, ringGroup, spellGroup, npcGroup, secretGroup].forEach(function (group) {
      if (!group) return;
      group.traverse(function (object) {
        if (!object.userData || !object.userData.floorAware || !object.material) return;
        markers += 1;
        if (Number(object.material.opacity) < 0.5) fadedMarkers += 1;
      });
    });
    return {
      markers: markers,
      fadedMarkers: fadedMarkers,
      otherFloorRows: document.querySelectorAll(".collectible-row.other-floor").length,
      higherFloorRows: document.querySelectorAll(".collectible-row.higher-floor").length,
      lowerFloorRows: document.querySelectorAll(".collectible-row.lower-floor").length
    };
  }

  function routeSegmentFloorOpacity(segment) {
    if (!indoorCutActive || !lastPlayerMapPosition || !segment || !segment.points) return 1;
    var closestHeightDifference = Infinity;
    for (var index = 0; index < segment.points.length; index++) {
      closestHeightDifference = Math.min(
        closestHeightDifference,
        Math.abs(segment.points[index].y - lastPlayerMapPosition.y)
      );
    }
    return indoorFloorOpacity(lastPlayerMapPosition.y + closestHeightDifference);
  }

  function resetIndoorCut() {
    indoorCutActive = false;
    indoorCutEvidence = 0;
    indoorLastCheck = 0;
    indoorCeilingDistance = null;
    indoorCutClearance = 4;
    indoorCutHeight = 100000;
    indoorCutRadius = 0;
    applyIndoorCutUniforms();
  }

  function pointIsCutAway(point) {
    if (!indoorCutEnabled || !indoorCutActive || !lastPlayerMapPosition || !point) return false;
    var dx = point.x - lastPlayerMapPosition.x;
    var dz = point.z - lastPlayerMapPosition.z;
    return point.y > indoorCutHeight && dx * dx + dz * dz < indoorCutRadius * indoorCutRadius;
  }

  function desiredFollowRadius() {
    var baseRadius;
    if (bounds.empty()) {
      baseRadius = indoorCutActive ? 34 : 42;
      return baseRadius * (hostWindowExpanded ? expandedRangeScale : 1);
    }
    var mapSize = bounds.size(new THREE.Vector3());
    var largestDimension = Math.max(mapSize.x, mapSize.y, mapSize.z);
    baseRadius = indoorCutActive
      ? Math.max(34, Math.min(150, largestDimension * 0.135))
      : Math.max(42, Math.min(210, largestDimension * 0.18));
    return baseRadius * (hostWindowExpanded ? expandedRangeScale : 1);
  }

  function updateHostWindowMode(message) {
    var expanded = !!message.expanded;
    if (expanded === hostWindowExpanded) return;

    if (expanded) {
      compactRadiusBeforeExpansion = radius;
      compactMapFramedBeforeExpansion = mapViewFramed;
    }
    hostWindowExpanded = expanded;
    document.body.classList.toggle("host-expanded", hostWindowExpanded);
    updateCollectionLayout();
    resetCameraAvoidance();
    if (playerOnCurrentMap) detectIndoorMode(true);

    if (followPlayer && playerOnCurrentMap) {
      followRadiusInitialized = false;
      focusOnPlayer(true);
    } else if (expanded || compactMapFramedBeforeExpansion || compactRadiusBeforeExpansion == null) {
      frameCurrentMap();
    } else {
      mapViewFramed = false;
      radius = clampZoomRadius(compactRadiusBeforeExpansion);
      camera.near = Math.max(radius / 2000, 0.1);
      camera.far = Math.max(radius * 30, 10000);
      camera.updateProjectionMatrix();
      updateCamera(true);
    }

    if (!expanded) compactRadiusBeforeExpansion = null;
  }

  function detectIndoorMode(force) {
    if (!indoorCutEnabled || !lastPlayerMapPosition || !playerOnCurrentMap || !meshes.length) {
      if (indoorCutActive || indoorCutEvidence) resetIndoorCut();
      else applyIndoorCutUniforms();
      return;
    }

    var now = Date.now();
    if (!force && now - indoorLastCheck < 320) {
      indoorCutHeight = lastPlayerMapPosition.y + indoorCutClearance;
      applyIndoorCutUniforms();
      return;
    }
    indoorLastCheck = now;
    scene.updateMatrixWorld(true);

    var sampleSpan = Math.max(1.4, Math.min(3.5, radius * 0.035));
    var maximumCeilingDistance = Math.max(10, Math.min(30, radius * 0.65));
    var ceilingHits = 0;
    var centerHit = false;
    var nearestCeiling = Infinity;
    for (var sampleIndex = 0; sampleIndex < indoorRayOffsets.length; sampleIndex++) {
      var offset = indoorRayOffsets[sampleIndex];
      indoorRayOrigin.copy(lastPlayerMapPosition);
      indoorRayOrigin.x += offset.x * sampleSpan;
      indoorRayOrigin.y += 1.1;
      indoorRayOrigin.z += offset.z * sampleSpan;
      indoorRaycaster.set(indoorRayOrigin, indoorRayDirection);
      indoorRaycaster.near = 0.35;
      indoorRaycaster.far = maximumCeilingDistance;
      var intersections = indoorRaycaster.intersectObjects(meshes, false);
      if (!intersections.length) continue;
      ceilingHits += 1;
      if (sampleIndex === 0) centerHit = true;
      nearestCeiling = Math.min(nearestCeiling, intersections[0].distance);
    }

    var ceilingDetected = centerHit || ceilingHits >= 2;
    indoorCutEvidence = ceilingDetected
      ? Math.min(4, indoorCutEvidence + 1)
      : Math.max(-4, indoorCutEvidence - 1);
    var wasActive = indoorCutActive;
    if (indoorCutActive) {
      if (indoorCutEvidence <= -3) indoorCutActive = false;
    } else if (indoorCutEvidence >= 2) {
      indoorCutActive = true;
    }

    if (Number.isFinite(nearestCeiling)) {
      indoorCeilingDistance = nearestCeiling;
      var desiredClearance = Math.max(2.6, Math.min(5.2, 1.1 + nearestCeiling * 0.62));
      indoorCutClearance += (desiredClearance - indoorCutClearance) * (force ? 1 : 0.42);
    }
    indoorCutHeight = lastPlayerMapPosition.y + indoorCutClearance;
    indoorCutRadius = Math.max(30, Math.min(100, desiredFollowRadius() * 1.65));
    applyIndoorCutUniforms();

    if (wasActive !== indoorCutActive) {
      followRadiusInitialized = false;
      resetCameraAvoidance();
    }
  }

  function setIndoorCutEnabled(enabled, persist) {
    indoorCutEnabled = !!enabled;
    if (persist) {
      localStorage.setItem("dsr-overlay-indoor-cut", indoorCutEnabled ? "true" : "false");
    }
    if (!indoorCutEnabled) resetIndoorCut();
    else detectIndoorMode(true);
    followRadiusInitialized = false;
    if (followPlayer && playerOnCurrentMap) focusOnPlayer(true);
    else updateCamera(true);
  }

  function cameraOrbitPosition(thetaValue, phiValue, distance, output) {
    var sinPhi = Math.sin(phiValue);
    return output.set(
      target.x + distance * sinPhi * Math.cos(thetaValue),
      target.y + distance * Math.cos(phiValue),
      target.z + distance * sinPhi * Math.sin(thetaValue)
    );
  }

  function cameraCandidates() {
    var basePhi = indoorCutActive ? Math.min(phi, 0.62) : phi;
    return [
      { theta: theta, phi: basePhi },
      { theta: theta, phi: Math.min(basePhi, indoorCutActive ? 0.52 : 0.72) },
      { theta: theta, phi: Math.min(basePhi, indoorCutActive ? 0.36 : 0.42) },
      { theta: theta + Math.PI / 3, phi: Math.min(basePhi, indoorCutActive ? 0.56 : 0.62) },
      { theta: theta - Math.PI / 3, phi: Math.min(basePhi, indoorCutActive ? 0.56 : 0.62) },
      { theta: theta + Math.PI * 2 / 3, phi: Math.min(basePhi, indoorCutActive ? 0.46 : 0.50) },
      { theta: theta - Math.PI * 2 / 3, phi: Math.min(basePhi, indoorCutActive ? 0.46 : 0.50) },
      { theta: theta + Math.PI, phi: Math.min(basePhi, indoorCutActive ? 0.34 : 0.38) }
    ];
  }

  function analyzeCameraPath(position) {
    var distance = position.distanceTo(target);
    var clearance = Math.max(2, Math.min(8, radius * 0.04));
    if (!meshes.length || distance <= clearance + 0.75) {
      return { clear: true, availableDistance: distance };
    }

    cameraRayDirection.subVectors(target, position).normalize();
    cameraRaycaster.set(position, cameraRayDirection);
    cameraRaycaster.near = 0.75;
    cameraRaycaster.far = distance - clearance;
    var intersections = cameraRaycaster.intersectObjects(meshes, false).filter(function (intersection) {
      // The roof and upper floor are discarded by the indoor slice shader.
      // Ignore those same fragments for camera placement so the virtual
      // camera does not keep jumping sideways to avoid invisible geometry.
      return !pointIsCutAway(intersection.point);
    });
    if (!intersections.length) {
      return { clear: true, availableDistance: distance };
    }

    // If every candidate is blocked, place the camera just beyond the last
    // obstruction on the target side. This keeps walls and roofs behind the
    // camera instead of between the camera and the player marker.
    var lastIntersection = intersections[intersections.length - 1];
    return {
      clear: false,
      availableDistance: Math.max(0, distance - lastIntersection.distance - clearance)
    };
  }

  function resetCameraAvoidance() {
    cameraAvoidanceIndex = 0;
    cameraAvoidanceDistance = null;
    cameraAvoidanceActive = false;
    cameraLineOfSightClear = true;
    cameraLastOcclusionCheck = 0;
    cameraThetaAtOcclusionCheck = null;
    viewButton.classList.remove("avoiding");
  }

  function resolveCameraOcclusion(force) {
    if (!playerOnCurrentMap || !followPlayer || !meshes.length) {
      resetCameraAvoidance();
      return;
    }

    var now = Date.now();
    var thetaChange = cameraThetaAtOcclusionCheck == null
      ? Infinity
      : Math.abs(shortestAngleDelta(cameraThetaAtOcclusionCheck, theta));
    if (!force && now - cameraLastOcclusionCheck < 240 && thetaChange < 0.12) return;

    cameraLastOcclusionCheck = now;
    cameraThetaAtOcclusionCheck = theta;
    scene.updateMatrixWorld(true);
    var candidates = cameraCandidates();
    var bestBlocked = null;
    for (var index = 0; index < candidates.length; index++) {
      var candidate = candidates[index];
      cameraOrbitPosition(candidate.theta, candidate.phi, radius, cameraCandidatePosition);
      var result = analyzeCameraPath(cameraCandidatePosition);
      if (result.clear) {
        cameraAvoidanceIndex = index;
        cameraAvoidanceDistance = radius;
        cameraAvoidanceActive = index !== 0;
        cameraLineOfSightClear = true;
        viewButton.classList.toggle("avoiding", cameraAvoidanceActive);
        return;
      }
      if (!bestBlocked || result.availableDistance > bestBlocked.availableDistance) {
        bestBlocked = {
          index: index,
          availableDistance: result.availableDistance
        };
      }
    }

    cameraAvoidanceIndex = bestBlocked ? bestBlocked.index : candidates.length - 1;
    cameraAvoidanceDistance = bestBlocked
      ? Math.max(1.5, bestBlocked.availableDistance)
      : Math.max(1.5, radius * 0.12);
    cameraAvoidanceActive = true;
    var resolvedCandidates = cameraCandidates();
    var resolvedCandidate = resolvedCandidates[cameraAvoidanceIndex];
    cameraOrbitPosition(
      resolvedCandidate.theta,
      resolvedCandidate.phi,
      cameraAvoidanceDistance,
      cameraCandidatePosition
    );
    cameraLineOfSightClear = analyzeCameraPath(cameraCandidatePosition).clear;
    viewButton.classList.add("avoiding");
  }

  function updateCamera(forceOcclusionCheck) {
    resolveCameraOcclusion(!!forceOcclusionCheck);
    var candidates = cameraCandidates();
    var candidate = candidates[Math.min(cameraAvoidanceIndex, candidates.length - 1)];
    var distance = cameraAvoidanceDistance == null ? radius : Math.min(radius, cameraAvoidanceDistance);
    cameraActualTheta = candidate.theta;
    cameraActualPhi = candidate.phi;
    cameraOrbitPosition(cameraActualTheta, cameraActualPhi, distance, cameraResolvedPosition);
    camera.position.copy(cameraResolvedPosition);
    if (followGameView && Number.isFinite(gameCameraHeading)) {
      cameraViewDirection.subVectors(target, camera.position).normalize();
      cameraHeadingForward.set(Math.cos(gameCameraHeading), 0, Math.sin(gameCameraHeading));
      cameraDesiredScreenUp.copy(cameraHeadingForward);
      var cameraForwardProjection = cameraDesiredScreenUp.dot(cameraViewDirection);
      cameraDesiredScreenUp.x -= cameraViewDirection.x * cameraForwardProjection;
      cameraDesiredScreenUp.y -= cameraViewDirection.y * cameraForwardProjection;
      cameraDesiredScreenUp.z -= cameraViewDirection.z * cameraForwardProjection;
      if (cameraDesiredScreenUp.lengthSq() > 0.000001) {
        camera.up.copy(cameraDesiredScreenUp.normalize());
      } else {
        camera.up.set(0, 1, 0);
      }
    } else {
      camera.up.set(0, 1, 0);
    }
    camera.lookAt(target);
  }

  function gameCameraScreenAngle() {
    if (!Number.isFinite(gameCameraHeading)) return null;
    var screenOrigin = target.clone().project(camera);
    var screenForward = target.clone().add(
      new THREE.Vector3(Math.cos(gameCameraHeading), 0, Math.sin(gameCameraHeading)).multiplyScalar(10)
    ).project(camera);
    return Math.atan2(screenForward.y - screenOrigin.y, screenForward.x - screenOrigin.x);
  }

  function applyGameCameraHeading(value, snap) {
    gameCameraHeading = value != null && Number.isFinite(Number(value)) ? Number(value) : null;
    if (!followGameView || gameCameraHeading == null) return;
    var desiredTheta = normalizeRadians(gameCameraHeading + Math.PI);
    if (snap || !gameViewInitialized) {
      theta = desiredTheta;
    } else {
      theta = normalizeRadians(theta + shortestAngleDelta(theta, desiredTheta) * 0.52);
    }
    gameViewInitialized = true;
  }

  function setFollowGameView(enabled, persist, snap) {
    followGameView = !!enabled;
    viewButton.classList.toggle("active", followGameView);
    if (persist) {
      localStorage.setItem("dsr-overlay-view-follow", followGameView ? "true" : "false");
    }
    if (!followGameView) {
      gameViewInitialized = false;
      return;
    }
    applyGameCameraHeading(gameCameraHeading, !!snap);
    updateCamera(true);
  }

  function clampZoomRadius(value) {
    return Math.max(1, Math.min(Math.max(10, mapOverviewRadius * 1.25), value));
  }

  function fitCurrentMap() {
    if (bounds.empty()) {
      target.set(0, 0, 0);
      radius = 100;
      mapOverviewRadius = radius;
      mapFraming = null;
    } else {
      bounds.center(target);
      // Fit actual collision vertices, not the map's longest axis or its empty
      // bounding-box corners. Account for horizontal FOV and perspective depth.
      radius = Math.max(10, bounds.size(new THREE.Vector3()).length());
      updateCamera(false);
      camera.updateMatrixWorld(true);
      var axes = camera.matrixWorld.elements;
      var right = new THREE.Vector3(axes[0], axes[1], axes[2]);
      var up = new THREE.Vector3(axes[4], axes[5], axes[6]);
      var back = new THREE.Vector3(axes[8], axes[9], axes[10]);
      var coordinateCount = meshes.reduce(function (count, mesh) {
        return count + mesh.geometry.attributes.position.array.length;
      }, 0);
      var coordinates = new Float32Array(coordinateCount);
      var coordinateIndex = 0;
      var tanVertical = Math.tan(camera.fov * Math.PI / 360);
      var tanHorizontal = tanVertical * camera.aspect;
      var fill = 0.90;
      var horizontalScale = tanHorizontal * fill;
      var verticalScale = tanVertical * fill;
      var maximumDepth = -Infinity;
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (var meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
        var positions = meshes[meshIndex].geometry.attributes.position.array;
        for (var vertex = 0; vertex < positions.length; vertex += 3) {
          var x = positions[vertex] - target.x;
          var y = positions[vertex + 1] - target.y;
          var z = positions[vertex + 2] - target.z;
          var screenX = x * right.x + y * right.y + z * right.z;
          var screenY = x * up.x + y * up.y + z * up.z;
          var vertexDepth = x * back.x + y * back.y + z * back.z;
          coordinates[coordinateIndex++] = screenX;
          coordinates[coordinateIndex++] = screenY;
          coordinates[coordinateIndex++] = vertexDepth;
          minX = Math.min(minX, screenX - vertexDepth * horizontalScale);
          maxX = Math.max(maxX, screenX + vertexDepth * horizontalScale);
          minY = Math.min(minY, screenY - vertexDepth * verticalScale);
          maxY = Math.max(maxY, screenY + vertexDepth * verticalScale);
          maximumDepth = Math.max(maximumDepth, vertexDepth);
        }
      }
      var centerX = (minX + maxX) / 2;
      var centerY = (minY + maxY) / 2;
      target.add(right.multiplyScalar(centerX)).add(up.multiplyScalar(centerY));
      // Depth-weighted extrema solve both sides of the perspective frustum,
      // so the tightest dimension fills the view without clipping or empty padding.
      radius = Math.max(10, maximumDepth + 1,
        (maxX - minX) / (2 * horizontalScale),
        (maxY - minY) / (2 * verticalScale));
      mapOverviewRadius = radius;
      var projectedMinX = Infinity, projectedMaxX = -Infinity;
      var projectedMinY = Infinity, projectedMaxY = -Infinity;
      for (var projected = 0; projected < coordinates.length; projected += 3) {
        var depth = radius - coordinates[projected + 2];
        var projectedX = (coordinates[projected] - centerX) / (depth * tanHorizontal);
        var projectedY = (coordinates[projected + 1] - centerY) / (depth * tanVertical);
        projectedMinX = Math.min(projectedMinX, projectedX);
        projectedMaxX = Math.max(projectedMaxX, projectedX);
        projectedMinY = Math.min(projectedMinY, projectedY);
        projectedMaxY = Math.max(projectedMaxY, projectedY);
      }
      mapFraming = {
        minX: projectedMinX, maxX: projectedMaxX,
        minY: projectedMinY, maxY: projectedMaxY,
        widthCoverage: (projectedMaxX - projectedMinX) / 2,
        heightCoverage: (projectedMaxY - projectedMinY) / 2
      };
    }
    camera.near = Math.max(radius / 2000, 0.1);
    camera.far = Math.max(radius * 20, 10000);
    camera.updateProjectionMatrix();
    updateCamera(true);
  }

  function frameCurrentMap() {
    mapViewFramed = true;
    theta = followGameView && Number.isFinite(gameCameraHeading)
      ? normalizeRadians(gameCameraHeading + Math.PI) : -0.75;
    phi = 1.05;
    fitCurrentMap();
  }

  function resetMapView() {
    setFollowPlayer(false, true, false);
    frameCurrentMap();
  }

  function disposeMeshes() {
    mapViewFramed = false;
    clearCollectibleNavigation(true);
    clearExplorationRoute();
    clearImportantItems();
    if (playerGroup) playerGroup.visible = false;
    playerOnCurrentMap = false;
    mapFraming = null;
    followRadiusInitialized = false;
    gameViewInitialized = false;
    resetIndoorCut();
    resetCameraAvoidance();
    for (var i = 0; i < meshes.length; i++) {
      scene.remove(meshes[i]);
      meshes[i].geometry.dispose();
    }
    meshes = [];
    navigationGraph = createNavigationGraph();
    bounds = new THREE.Box3();
  }

  function clearExplorationRoute() {
    routePanel.innerHTML = "";
    routeSegments = [];
    routeGuideLine = null;
    routeGuideStatus = null;
    routePointRows = [];
    if (!routeGroup) return;
    scene.remove(routeGroup);
    routeGroup.traverse(function (object) {
      if (object.geometry && object.geometry.dispose) object.geometry.dispose();
      if (object.material) {
        if (object.material.map && object.material.map.dispose) object.material.map.dispose();
        if (object.material.dispose) object.material.dispose();
      }
    });
    routeGroup = null;
  }

  function clearImportantItems() {
    itemPanel.innerHTML = "";
    collectibleRows = [];
    updateCollectionLayout();
    [itemGroup, keyItemGroup, bonfireGroup, weaponGroup, ringGroup, spellGroup, npcGroup, secretGroup].forEach(function (group) {
      if (!group) return;
      scene.remove(group);
      group.traverse(function (object) {
        if (object.geometry && object.geometry.dispose) object.geometry.dispose();
        if (object.material) {
          if (object.material.map && object.material.map.dispose) object.material.map.dispose();
          if (object.material.dispose) object.material.dispose();
        }
      });
    });
    itemGroup = null;
    keyItemGroup = null;
    bonfireGroup = null;
    weaponGroup = null;
    ringGroup = null;
    spellGroup = null;
    npcGroup = null;
    secretGroup = null;
  }

  function gameToMapPosition(point, lift) {
    return new THREE.Vector3(point[2], point[1] + (lift || 0), point[0]);
  }

  function createNavigationGraph() {
    return {
      nodes: [],
      index: Object.create(null)
    };
  }

  function navigationKey(x, y, z) {
    // Collision triangles from different chunks often meet with small export
    // differences. Half-unit welding joins the same floor without bridging
    // separate storeys or opposite sides of ordinary walls.
    var precision = 2;
    return Math.round(x * precision) + ":" +
      Math.round(y * precision) + ":" +
      Math.round(z * precision);
  }

  function navigationNode(x, y, z) {
    if (!navigationGraph) navigationGraph = createNavigationGraph();
    var key = navigationKey(x, y, z);
    var existing = navigationGraph.index[key];
    if (existing != null) return existing;
    var id = navigationGraph.nodes.length;
    navigationGraph.index[key] = id;
    navigationGraph.nodes.push({
      position: new THREE.Vector3(x, y, z),
      neighbors: [],
      links: Object.create(null)
    });
    return id;
  }

  function connectNavigationNodes(a, b) {
    if (a === b) return;
    var first = navigationGraph.nodes[a];
    var second = navigationGraph.nodes[b];
    if (first.links[b]) return;
    var cost = first.position.distanceTo(second.position);
    if (!isFinite(cost) || cost <= 0) return;
    first.links[b] = true;
    second.links[a] = true;
    first.neighbors.push({ id: b, cost: cost });
    second.neighbors.push({ id: a, cost: cost });
  }

  function addNavigationGeometry(geometry) {
    var attribute = geometry.attributes.position;
    if (!attribute || !attribute.array) return;
    var values = attribute.array;
    for (var i = 0; i + 8 < values.length; i += 9) {
      var ax = values[i];
      var ay = values[i + 1];
      var az = values[i + 2];
      var bx = values[i + 3];
      var by = values[i + 4];
      var bz = values[i + 5];
      var cx = values[i + 6];
      var cy = values[i + 7];
      var cz = values[i + 8];

      var abx = bx - ax;
      var aby = by - ay;
      var abz = bz - az;
      var acx = cx - ax;
      var acy = cy - ay;
      var acz = cz - az;
      var nx = aby * acz - abz * acy;
      var ny = abz * acx - abx * acz;
      var nz = abx * acy - aby * acx;
      var normalLength = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (!normalLength || Math.abs(ny) / normalLength < 0.42) continue;

      var a = navigationNode(ax, ay, az);
      var b = navigationNode(bx, by, bz);
      var c = navigationNode(cx, cy, cz);
      connectNavigationNodes(a, b);
      connectNavigationNodes(b, c);
      connectNavigationNodes(c, a);
    }
  }

  function stitchNavigationGraph() {
    if (!navigationGraph || navigationGraph.stitched || navigationGraph.nodes.length < 2) return;
    navigationGraph.stitched = true;
    var nodes = navigationGraph.nodes;
    var cellSize = 2;
    var maxHorizontalSquared = 2.2 * 2.2;
    var maxVertical = 2.8;
    var buckets = Object.create(null);

    function cellKey(x, y, z) {
      return Math.floor(x / cellSize) + ":" + Math.floor(y / cellSize) + ":" + Math.floor(z / cellSize);
    }

    for (var i = 0; i < nodes.length; i++) {
      var position = nodes[i].position;
      var key = cellKey(position.x, position.y, position.z);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(i);
    }

    for (var nodeId = 0; nodeId < nodes.length; nodeId++) {
      var node = nodes[nodeId];
      var baseX = Math.floor(node.position.x / cellSize);
      var baseY = Math.floor(node.position.y / cellSize);
      var baseZ = Math.floor(node.position.z / cellSize);
      var candidates = [];
      for (var ox = -2; ox <= 2; ox++) {
        for (var oy = -2; oy <= 2; oy++) {
          for (var oz = -2; oz <= 2; oz++) {
            var bucket = buckets[(baseX + ox) + ":" + (baseY + oy) + ":" + (baseZ + oz)];
            if (!bucket) continue;
            for (var b = 0; b < bucket.length; b++) {
              var candidateId = bucket[b];
              if (candidateId <= nodeId || node.links[candidateId]) continue;
              var candidate = nodes[candidateId];
              var dy = Math.abs(candidate.position.y - node.position.y);
              if (dy > maxVertical) continue;
              var dx = candidate.position.x - node.position.x;
              var dz = candidate.position.z - node.position.z;
              var horizontalSquared = dx * dx + dz * dz;
              if (!horizontalSquared || horizontalSquared > maxHorizontalSquared) continue;
              candidates.push({
                id: candidateId,
                distanceSquared: horizontalSquared + dy * dy * 1.8
              });
            }
          }
        }
      }
      candidates.sort(function (a, b) { return a.distanceSquared - b.distanceSquared; });
      for (var c = 0; c < Math.min(4, candidates.length); c++) {
        connectNavigationNodes(nodeId, candidates[c].id);
      }
    }
  }

  function closestNavigationNode(point) {
    if (!navigationGraph || !navigationGraph.nodes.length) return -1;
    var best = -1;
    var bestDistance = Infinity;
    for (var i = 0; i < navigationGraph.nodes.length; i++) {
      var candidate = navigationGraph.nodes[i].position;
      var dx = candidate.x - point.x;
      var dy = candidate.y - point.y;
      var dz = candidate.z - point.z;
      var distance = dx * dx + dz * dz + dy * dy * 2.5;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return best;
  }

  function MinHeap() {
    this.items = [];
  }

  MinHeap.prototype.push = function (entry) {
    var items = this.items;
    items.push(entry);
    var index = items.length - 1;
    while (index > 0) {
      var parent = Math.floor((index - 1) / 2);
      if (items[parent].score <= entry.score) break;
      items[index] = items[parent];
      index = parent;
    }
    items[index] = entry;
  };

  MinHeap.prototype.pop = function () {
    var items = this.items;
    if (!items.length) return null;
    var root = items[0];
    var tail = items.pop();
    if (!items.length) return root;
    var index = 0;
    while (true) {
      var left = index * 2 + 1;
      var right = left + 1;
      if (left >= items.length) break;
      var smallest = right < items.length && items[right].score < items[left].score ? right : left;
      if (items[smallest].score >= tail.score) break;
      items[index] = items[smallest];
      index = smallest;
    }
    items[index] = tail;
    return root;
  };

  function pointSegmentDistanceSquared(point, a, b) {
    var ab = b.clone().sub(a);
    var lengthSquared = ab.lengthSq();
    if (!lengthSquared) return point.distanceToSquared(a);
    var amount = Math.max(0, Math.min(1, point.clone().sub(a).dot(ab) / lengthSquared));
    var nearest = a.clone().add(ab.multiplyScalar(amount));
    return point.distanceToSquared(nearest);
  }

  function simplifyNavigationPath(points, tolerance) {
    if (points.length <= 2) return points.slice();
    var toleranceSquared = tolerance * tolerance;
    var keep = new Uint8Array(points.length);
    keep[0] = 1;
    keep[points.length - 1] = 1;
    var stack = [[0, points.length - 1]];
    while (stack.length) {
      var range = stack.pop();
      var bestIndex = -1;
      var bestDistance = toleranceSquared;
      for (var i = range[0] + 1; i < range[1]; i++) {
        var distance = pointSegmentDistanceSquared(points[i], points[range[0]], points[range[1]]);
        if (distance > bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
      if (bestIndex >= 0) {
        keep[bestIndex] = 1;
        stack.push([range[0], bestIndex], [bestIndex, range[1]]);
      }
    }
    var result = [];
    for (var j = 0; j < points.length; j++) {
      if (keep[j]) result.push(points[j]);
    }
    return result;
  }

  function navigationPath(start, end) {
    var fallback = [start.clone(), end.clone()];
    fallback.navigationResolved = false;
    if (!navigationGraph || navigationGraph.nodes.length < 2) return fallback;
    var startId = closestNavigationNode(start);
    var endId = closestNavigationNode(end);
    if (startId < 0 || endId < 0) return fallback;
    if(navigationGraph.nodes[startId].position.distanceTo(start)>6 || navigationGraph.nodes[endId].position.distanceTo(end)>6) return fallback;

    var count = navigationGraph.nodes.length;
    var scores = new Float64Array(count);
    var previous = new Int32Array(count);
    var closed = new Uint8Array(count);
    for (var i = 0; i < count; i++) {
      scores[i] = Infinity;
      previous[i] = -1;
    }
    scores[startId] = 0;
    var heap = new MinHeap();
    heap.push({ id: startId, score: navigationGraph.nodes[startId].position.distanceTo(end) });
    var reached = false;
    var expanded = 0;

    while (heap.items.length && expanded < 140000) {
      var current = heap.pop();
      if (closed[current.id]) continue;
      if (current.id === endId) {
        reached = true;
        break;
      }
      closed[current.id] = 1;
      expanded += 1;
      var neighbors = navigationGraph.nodes[current.id].neighbors;
      for (var n = 0; n < neighbors.length; n++) {
        var edge = neighbors[n];
        if (closed[edge.id]) continue;
        var nextScore = scores[current.id] + edge.cost;
        if (nextScore >= scores[edge.id]) continue;
        scores[edge.id] = nextScore;
        previous[edge.id] = current.id;
        heap.push({
          id: edge.id,
          score: nextScore + navigationGraph.nodes[edge.id].position.distanceTo(end)
        });
      }
    }

    if (!reached) return fallback;
    var nodeIds = [];
    var cursor = endId;
    while (cursor >= 0) {
      nodeIds.push(cursor);
      if (cursor === startId) break;
      cursor = previous[cursor];
    }
    if (nodeIds[nodeIds.length - 1] !== startId) return fallback;
    nodeIds.reverse();

    var result = [start.clone()];
    var length = 0;
    for (var p = 0; p < nodeIds.length; p++) {
      var nodePosition = navigationGraph.nodes[nodeIds[p]].position.clone();
      length += result[result.length - 1].distanceTo(nodePosition);
      result.push(nodePosition);
    }
    length += result[result.length - 1].distanceTo(end);
    result.push(end.clone());
    var direct = Math.max(1, start.distanceTo(end));
    if (length > direct * 8 + 80) return fallback;
    var simplified = simplifyNavigationPath(result, 0.45);
    simplified.navigationResolved = true;
    return simplified;
  }

  function PolylineCurve3(points) {
    THREE.Curve.call(this);
    this.points = points;
    this.lengths = [0];
    this.totalLength = 0;
    for (var i = 1; i < points.length; i++) {
      this.totalLength += points[i - 1].distanceTo(points[i]);
      this.lengths.push(this.totalLength);
    }
  }

  PolylineCurve3.prototype = Object.create(THREE.Curve.prototype);
  PolylineCurve3.prototype.constructor = PolylineCurve3;
  PolylineCurve3.prototype.getPoint = function (t) {
    if (!this.totalLength) return this.points[0].clone();
    var desired = Math.max(0, Math.min(1, t)) * this.totalLength;
    var low = 0;
    var high = this.lengths.length - 1;
    while (low + 1 < high) {
      var mid = Math.floor((low + high) / 2);
      if (this.lengths[mid] <= desired) low = mid;
      else high = mid;
    }
    var start = this.points[low];
    var end = this.points[Math.min(low + 1, this.points.length - 1)];
    var span = this.lengths[Math.min(low + 1, this.lengths.length - 1)] - this.lengths[low];
    var amount = span ? (desired - this.lengths[low]) / span : 0;
    return start.clone().lerp(end, amount);
  };

  function createRouteTube(points, lift, width) {
    var raised = points.map(function (point) {
      var result = point.clone();
      result.y += lift;
      return result;
    });
    var curve = new PolylineCurve3(raised);
    var segments = Math.max(8, Math.min(900, Math.ceil(curve.totalLength / 1.4)));
    var group = new THREE.Object3D();
    var haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x45d8ff,
      transparent: true,
      opacity: 0.22,
      depthTest: false,
      depthWrite: false
    });
    var coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x45d8ff,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
      depthWrite: false
    });
    var halo = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, width * 1.75, 5, false), haloMaterial);
    var core = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, width, 5, false), coreMaterial);
    halo.renderOrder = 8;
    core.renderOrder = 9;
    group.add(halo);
    group.add(core);
    return { group: group, core: core, halo: halo };
  }

  function collectibleRouteIdentity(mapKey, kind, entry) {
    return collectibleEntryKey(mapKey, kind, entry);
  }

  function collectibleRouteMatches(mapKey, kind, entry) {
    return !!collectibleRouteTarget && collectibleRouteTarget.identity === collectibleRouteIdentity(mapKey, kind, entry);
  }

  function syncCollectibleRouteRows() {
    collectibleRows.forEach(function (record) {
      record.row.classList.toggle("route-target",
        collectibleRouteMatches(record.mapKey, record.kind, record.entry));
    });
    Array.prototype.forEach.call(itemPanel.querySelectorAll(".item-point[data-route-identity]"), function (row) {
      row.classList.toggle("route-target", !!collectibleRouteTarget &&
        row.getAttribute("data-route-identity") === collectibleRouteTarget.identity);
    });
  }

  function setCollectibleRouteStatus(text) {
    var existing = document.getElementById("collectibleRouteStatus");
    if (!collectibleRouteTarget || !text) {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return;
    }
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "collectibleRouteStatus";
      existing.className = "collectible-route-status";
      existing.setAttribute("role", "status");
      itemPanel.insertBefore(existing, itemPanel.firstChild);
    }
    existing.textContent = text;
  }

  function disposeCollectibleRouteGroup() {
    if (!collectibleRouteGroup) return;
    scene.remove(collectibleRouteGroup);
    collectibleRouteGroup.traverse(function (object) {
      if (object.geometry && object.geometry.dispose) object.geometry.dispose();
      if (object.material) {
        if (object.material.map && object.material.map.dispose) object.material.map.dispose();
        if (object.material.dispose) object.material.dispose();
      }
    });
    collectibleRouteGroup = null;
    collectibleRoutePath = [];
    collectibleRouteStart = null;
  }

  function clearCollectibleNavigation(clearTarget) {
    disposeCollectibleRouteGroup();
    if (clearTarget) {
      collectibleRouteTarget = null;
      setCollectibleRouteStatus("");
      syncCollectibleRouteRows();
    }
  }

  function collectibleRouteLength(points) {
    var total = 0;
    for (var index = 1; index < points.length; index++) {
      total += points[index - 1].distanceTo(points[index]);
    }
    return total;
  }

  function collectibleRouteMarkerEntry(targetDefinition) {
    var kind = targetDefinition.kind;
    if (kind === "important") return { marker: targetDefinition.entry.marker || "rare" };
    return {
      marker: kind,
      schoolEn: targetDefinition.entry.schoolEn,
      secretType: targetDefinition.entry.type
    };
  }

  function updateCollectibleNavigation(position, force) {
    if (!collectibleRouteTarget) return;
    var currentEntry = recommendedRoute[currentRouteIndex];
    var currentMapKey = canonicalCollectionKey(currentEntry.routeKey || String(currentEntry.source));
    if (currentMapKey !== collectibleRouteTarget.mapKey) {
      clearCollectibleNavigation(true);
      return;
    }

    var targetPosition = gameToMapPosition(collectibleRouteTarget.entry.p, 0);
    var directDistance = position ? position.distanceTo(targetPosition) : Infinity;
    if (!playerOnCurrentMap || !position) {
      disposeCollectibleRouteGroup();
      setCollectibleRouteStatus(
        tr("collectibleRouteWaiting", "寻路目标：") + collectibleRouteTarget.name +
        tr("collectibleRouteWaitingSuffix", " · 等待当前地图的玩家坐标")
      );
      return;
    }

    if (!force && collectibleRouteStart && position.distanceTo(collectibleRouteStart) < 7 && collectibleRoutePath.length) {
      var nearest = closestPointOnPath(position, collectibleRoutePath);
      var remaining = nearest ? nearest.remaining : directDistance;
      var stableFloor = formatFloorDifference(
        targetPosition.y - position.y,
        Math.hypot(targetPosition.x - position.x, targetPosition.z - position.z)
      );
      setCollectibleRouteStatus(
        (directDistance <= 4 ? tr("collectibleRouteArrived", "已到达目标附近：") : tr("collectibleRouteTarget", "寻路目标：")) +
        collectibleRouteTarget.name + (directDistance <= 4 ? "" :
          trDistance("collectibleRouteRemaining", " · 沿路线约 {distance} m", Math.max(0, Math.round(remaining)))) +
        (stableFloor ? " · " + stableFloor : "")
      );
      return;
    }

    disposeCollectibleRouteGroup();
    var resolvedPath = navigationPath(position, targetPosition);
    if(!resolvedPath.navigationResolved) {
      collectibleRouteStart=position.clone();
      setCollectibleRouteStatus("目标："+collectibleRouteTarget.name+" · 未找到连通路径；检查梯子、机关或跨层通路，地图仅保留目标标记。");
      return;
    }
    var mapSize = bounds.size(new THREE.Vector3());
    var largestDimension = Math.max(mapSize.x, mapSize.y, mapSize.z);
    var lift = Math.max(0.75, Math.min(2.2, largestDimension * 0.0025));
    var routeWidth = Math.max(0.58, Math.min(2.1, largestDimension * 0.0026));
    var markerSize = Math.max(5, Math.min(16, largestDimension * 0.021));
    var tube = createRouteTube(resolvedPath, lift, routeWidth);
    tube.core.material.color.setHex(0xffc857);
    tube.core.material.opacity = 1;
    tube.halo.material.color.setHex(0xff9f43);
    tube.halo.material.opacity = 0.32;

    collectibleRouteGroup = new THREE.Object3D();
    collectibleRouteGroup.add(tube.group);
    var endpoint = makeItemMarker(
      targetPosition.clone().add(new THREE.Vector3(0, lift + markerSize * 0.18, 0)),
      markerSize,
      collectibleRouteMarkerEntry(collectibleRouteTarget)
    );
    endpoint.renderOrder = 13;
    collectibleRouteGroup.add(endpoint);
    scene.add(collectibleRouteGroup);
    collectibleRoutePath = resolvedPath;
    collectibleRouteStart = position.clone();

    var total = collectibleRouteLength(resolvedPath);
    var prefix = directDistance <= 4
      ? tr("collectibleRouteArrived", "已到达目标附近：")
      : tr("collectibleRouteBuilt", "已生成物品路线：");
    var suffix = directDistance <= 4
      ? ""
      : trDistance("collectibleRouteRemaining", " · 沿路线约 {distance} m", Math.max(0, Math.round(total))) +
        (resolvedPath.navigationResolved === false ? tr("collectibleRouteApproximate", " · 网格不连通，末段为直线指引") : "");
    var routeFloor = formatFloorDifference(
      targetPosition.y - position.y,
      Math.hypot(targetPosition.x - position.x, targetPosition.z - position.z)
    );
    if (routeFloor) suffix += " · " + routeFloor;
    setCollectibleRouteStatus(prefix + collectibleRouteTarget.name + suffix);
  }

  function setCollectibleNavigation(mapKey, kind, entry) {
    var identity = collectibleRouteIdentity(mapKey, kind, entry);
    if (collectibleRouteTarget && collectibleRouteTarget.identity === identity) {
      clearCollectibleNavigation(true);
      setStatus(tr("collectibleRouteCancelled", "已取消物品路线"));
      return;
    }
    clearCollectibleNavigation(false);
    collectibleRouteTarget = {
      mapKey: canonicalCollectionKey(mapKey),
      kind: kind,
      entry: entry,
      identity: identity,
      name: localizedCollectibleValue(entry, "name")
    };
    syncCollectibleRouteRows();
    updateCollectibleNavigation(lastPlayerMapPosition, true);
  }

  function closestPointOnPath(point, points) {
    var best = null;
    var distanceFromEnd = 0;
    var suffix = new Float64Array(points.length);
    for (var i = points.length - 2; i >= 0; i--) {
      suffix[i] = suffix[i + 1] + points[i].distanceTo(points[i + 1]);
    }
    for (var j = 0; j < points.length - 1; j++) {
      var a = points[j];
      var b = points[j + 1];
      var ab = b.clone().sub(a);
      var lengthSquared = ab.lengthSq();
      var amount = lengthSquared ? Math.max(0, Math.min(1, point.clone().sub(a).dot(ab) / lengthSquared)) : 0;
      var nearest = a.clone().add(ab.multiplyScalar(amount));
      var distanceSquared = point.distanceToSquared(nearest);
      if (!best || distanceSquared < best.distanceSquared) {
        distanceFromEnd = nearest.distanceTo(b) + suffix[j + 1];
        best = {
          point: nearest,
          distanceSquared: distanceSquared,
          remaining: distanceFromEnd
        };
      }
    }
    return best;
  }

  function makeNumberMarker(number, position, size) {
    var canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    var context = canvas.getContext("2d");
    context.beginPath();
    context.arc(64, 64, 52, 0, Math.PI * 2);
    context.fillStyle = "#ffc857";
    context.fill();
    context.lineWidth = 8;
    context.strokeStyle = "rgba(18, 22, 29, 0.92)";
    context.stroke();
    context.fillStyle = "#12161d";
    context.font = "bold 58px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(number), 64, 68);

    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    var markerMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    var sprite = new THREE.Sprite(markerMaterial);
    sprite.position.copy(position);
    sprite.scale.set(size, size, 1);
    sprite.userData.floorAware = true;
    sprite.userData.mapHeight = position.y;
    sprite.userData.mapX = position.x;
    sprite.userData.mapZ = position.z;
    sprite.userData.baseSize = size;
    return sprite;
  }

  function itemMarkerStyle(entry) {
    if (entry.collectibleCompleted) return { color: "#92a0ad", symbol: "✓", className: "completed" };
    if (entry.sourceKind === "enemy-drop" || entry.sourceKind === "mixed-drop") {
      return { color: "#ff7f50", symbol: "D", className: "drop" };
    }
    if (entry.marker === "bonfire") return { color: "#ff8a3d", symbol: "B", className: "bonfire" };
    if (entry.marker === "item") return { color: "#55c7ff", symbol: "I", className: "item" };
    if (entry.marker === "weapon") return { color: "#ff6969", symbol: "W", className: "weapon" };
    if (entry.marker === "ring") return { color: "#ffcb4c", symbol: "R", className: "ring" };
    if (entry.marker === "spell") {
      var spellColors = {
        Sorcery: "#65b7ff",
        Miracle: "#ffe36e",
        Pyromancy: "#ff774d",
        Hex: "#a98cff"
      };
      return { color: spellColors[entry.schoolEn] || "#d58cff", symbol: "S", className: "spell" };
    }
    if (entry.marker === "npc") return { color: "#42e695", symbol: "N", className: "npc" };
    if (entry.marker === "secret") {
      if (entry.secretType === "pharros") return { color: "#b38cff", symbol: "↔", className: "secret" };
      if (entry.secretType === "breakable") return { color: "#ff9f43", symbol: "↔", className: "secret" };
      return { color: "#34e7e4", symbol: "↔", className: "secret" };
    }
    if (entry.marker === "achievement") return { color: "#ff63d8", symbol: "★", className: "achievement" };
    if (entry.marker === "rare") return { color: "#ff9f43", symbol: "◆", className: "rare" };
    if (entry.marker === "dlc") return { color: "#a78bfa", symbol: "D", className: "dlc" };
    return { color: "#55c7ff", symbol: "!", className: "exact" };
  }

  function makeItemMarker(position, size, entry) {
    var style = itemMarkerStyle(entry);
    var canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    var context = canvas.getContext("2d");
    context.save();
    context.translate(64, 64);
    context.rotate(Math.PI / 4);
    context.fillStyle = style.color;
    context.strokeStyle = "rgba(5, 17, 27, 0.95)";
    context.lineWidth = 8;
    context.fillRect(-38, -38, 76, 76);
    context.strokeRect(-38, -38, 76, 76);
    context.restore();
    context.fillStyle = "#07141d";
    context.font = "900 58px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(style.symbol, 64, 66);

    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    var markerMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    var sprite = new THREE.Sprite(markerMaterial);
    sprite.position.copy(position);
    sprite.scale.set(size, size, 1);
    sprite.userData.floorAware = true;
    sprite.userData.mapHeight = position.y;
    sprite.userData.mapX = position.x;
    sprite.userData.mapZ = position.z;
    sprite.userData.baseSize = size;
    return sprite;
  }

  function makePlayerMarker(position, size) {
    var marker = new THREE.Object3D();
    marker.position.copy(position);

    var baseCanvas = document.createElement("canvas");
    baseCanvas.width = 160;
    baseCanvas.height = 160;
    var context = baseCanvas.getContext("2d");
    context.beginPath();
    context.arc(80, 88, 47, 0, Math.PI * 2);
    context.fillStyle = "rgba(85, 220, 255, 0.96)";
    context.fill();
    context.lineWidth = 9;
    context.strokeStyle = "rgba(2, 14, 22, 0.96)";
    context.stroke();

    var baseTexture = new THREE.Texture(baseCanvas);
    baseTexture.needsUpdate = true;
    var baseSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: baseTexture,
      transparent: true,
      depthTest: false
    }));
    baseSprite.renderOrder = 20;
    marker.add(baseSprite);

    var arrowCanvas = document.createElement("canvas");
    arrowCanvas.width = 160;
    arrowCanvas.height = 160;
    context = arrowCanvas.getContext("2d");
    // The arrow points toward the top of the texture. Its material is rotated
    // every frame to match the screen projection of the in-game heading.
    context.beginPath();
    context.moveTo(80, 8);
    context.lineTo(119, 69);
    context.lineTo(96, 62);
    context.lineTo(96, 104);
    context.lineTo(64, 104);
    context.lineTo(64, 62);
    context.lineTo(41, 69);
    context.closePath();
    context.fillStyle = "#ffffff";
    context.fill();
    context.lineWidth = 7;
    context.lineJoin = "round";
    context.strokeStyle = "rgba(2, 14, 22, 0.96)";
    context.stroke();

    context.beginPath();
    context.arc(80, 112, 10, 0, Math.PI * 2);
    context.fillStyle = "#087fa5";
    context.fill();
    context.lineWidth = 4;
    context.strokeStyle = "#ffffff";
    context.stroke();

    var arrowTexture = new THREE.Texture(arrowCanvas);
    arrowTexture.needsUpdate = true;
    var arrowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: arrowTexture,
      transparent: true,
      depthTest: false
    }));
    arrowSprite.renderOrder = 21;
    marker.add(arrowSprite);
    marker.userData.directionSprite = arrowSprite;
    marker.scale.set(size, size, 1);
    return marker;
  }

  function updatePlayerMarkerRotation() {
    if (!playerMarker || !playerDirectionMarker) return;
    playerDirectionMarker.visible = Number.isFinite(playerHeading);
    if (!playerDirectionMarker.visible) return;

    // Live forward movement confirms game X/Z = (-sin(yaw), -cos(yaw)).
    // gameToMapPosition swaps X/Z, so map forward is (-cos(yaw), -sin(yaw)).
    // Project the tangent in homogeneous coordinates: a distant endpoint can
    // cross the camera plane and incorrectly flip the arrow in close views.
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.getInverse(camera.matrixWorld);
    headingProjectionStart.set(playerMarker.position.x, playerMarker.position.y, playerMarker.position.z, 1)
      .applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
    headingProjectionEnd.set(-Math.cos(playerHeading), 0, -Math.sin(playerHeading), 0)
      .applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);

    // Sprite rotation is measured in screen pixels, not normalized clip space.
    var screenX = (headingProjectionEnd.x * headingProjectionStart.w - headingProjectionStart.x * headingProjectionEnd.w) * viewport.clientWidth;
    var screenY = (headingProjectionEnd.y * headingProjectionStart.w - headingProjectionStart.y * headingProjectionEnd.w) * viewport.clientHeight;
    if (Math.abs(screenX) + Math.abs(screenY) < 0.000001) return;
    playerDirectionMarker.material.rotation = Math.atan2(screenY, screenX) - Math.PI / 2;
  }

  function ensurePlayerMarker(size) {
    playerMarkerBaseSize = size;
    if (!playerGroup) {
      playerGroup = new THREE.Object3D();
      playerMarker = makePlayerMarker(new THREE.Vector3(), size);
      playerDirectionMarker = playerMarker.userData.directionSprite;
      playerGroup.add(playerMarker);
      scene.add(playerGroup);
    }
    playerMarker.scale.set(size, size, 1);
    return playerMarker;
  }

  function setPlayerStatus(text, stateClass) {
    playerStatus.textContent = text;
    playerStatus.classList.remove("tracking-mismatch", "tracking-error");
    if (stateClass) playerStatus.classList.add(stateClass);
  }

  function isInsideCurrentMap(position, margin) {
    if (bounds.empty()) return false;
    return position.x >= bounds.min.x - margin && position.x <= bounds.max.x + margin &&
      position.y >= bounds.min.y - margin && position.y <= bounds.max.y + margin &&
      position.z >= bounds.min.z - margin && position.z <= bounds.max.z + margin;
  }

  function focusOnPlayer(resetZoom) {
    if (!lastPlayerMapPosition || !playerOnCurrentMap) return;
    mapViewFramed = false;
    target.copy(lastPlayerMapPosition);
    if (resetZoom || !followRadiusInitialized) {
      radius = clampZoomRadius(desiredFollowRadius());
      followRadiusInitialized = true;
      camera.near = Math.max(radius / 2000, 0.1);
      camera.far = Math.max(radius * 30, 10000);
      camera.updateProjectionMatrix();
    }
    updateCamera();
  }

  function setFollowPlayer(enabled, persist, resetZoom) {
    followPlayer = !!enabled;
    followButton.classList.toggle("active", followPlayer);
    if (persist) {
      localStorage.setItem("dsr-overlay-follow-player", followPlayer ? "true" : "false");
    }
    if (followPlayer) focusOnPlayer(!!resetZoom);
    else {
      resetCameraAvoidance();
      updateCamera(true);
    }
  }

  function selectMapForPlayer(message) {
    var id = Number(message.mapId), desiredIndex = mapIdToRouteIndex[String(id)];
    if (!autoRegion || desiredIndex == null || desiredIndex < 0) return false;
    if (regionCandidate !== id) {regionCandidate=id;regionSamples=1;return false;}
    regionSamples++;
    if (regionSamples < 3 || currentRouteIndex === desiredIndex) return false;
    setPlayerStatus("检测到玩家区域，正在切换地图…","");
    loadMap(desiredIndex);
    return true;
  }

  function updatePlayerPosition(message, resetZoom) {
    lastPlayerMessage = message;
    if (selectMapForPlayer(message)) return;
    if (bounds.empty()) return;

    var mapPosition = gameToMapPosition([Number(message.x), Number(message.y), Number(message.z)], 0);
    var mapSize = bounds.size(new THREE.Vector3());
    var largestDimension = Math.max(mapSize.x, mapSize.y, mapSize.z);
    var margin = Math.max(5, largestDimension * 0.015);
    if (!isInsideCurrentMap(mapPosition, margin)) {
      playerOnCurrentMap = false;
      resetIndoorCut();
      if (playerGroup) playerGroup.visible = false;
      if (routeGuideLine) routeGuideLine.visible = false;
      if (routeGuideStatus) routeGuideStatus.textContent = tr("playerWrongMapRoute", "玩家不在当前地图，无法匹配路线");
      setPlayerStatus(tr("playerWrongMap", "玩家不在当前地图 · 请切换区域"), "tracking-mismatch");
      updateCollectibleDistances(true);
      return;
    }

    var wasOnCurrentMap = playerOnCurrentMap;
    playerOnCurrentMap = true;
    lastPlayerMapPosition = mapPosition.clone();
    var expectedMap = mapIdToRouteIndex[String(Number(message.mapId))];
    if (expectedMap != null && expectedMap !== currentRouteIndex) {
      playerOnCurrentMap = false;
      if(playerGroup) playerGroup.visible=false;
      setPlayerStatus("正在手动查看其他区域 · 点击自动区域返回角色位置","tracking-mismatch");
      updateCollectibleDistances(true); return;
    }
    detectIndoorMode(false);
    applyGameCameraHeading(message.cameraHeading, resetZoom || !wasOnCurrentMap);
    var lift = Math.max(1.8, Math.min(5, largestDimension * 0.006));
    var markerSize = indoorCutActive
      ? Math.max(4.5, Math.min(9, largestDimension * 0.014))
      : Math.max(5, Math.min(18, largestDimension * 0.025));
    var marker = ensurePlayerMarker(markerSize);
    marker.position.copy(mapPosition);
    marker.position.y += lift;
    playerHeading = message.heading != null && Number.isFinite(Number(message.heading))
      ? Number(message.heading)
      : null;
    updatePlayerMarkerRotation();
    playerGroup.visible = true;
    var headingText = playerHeading == null
      ? ""
      : " · " + tr("heading", "朝向") + " " +
        (((playerHeading * 180 / Math.PI) % 360 + 360) % 360).toFixed(0) + "°";
    setPlayerStatus(
      tr("liveTracking", "实时定位") + " · X " + Number(message.x).toFixed(1) +
      " · Y " + Number(message.y).toFixed(1) +
      " · Z " + Number(message.z).toFixed(1) + headingText,
      "");

    updateRouteGuidance(mapPosition);
    updateCollectibleNavigation(mapPosition, false);
    updateIndoorMarkerVisibility();
    // A newly loaded map may have refreshed the list less than 350 ms ago.
    // A real player sample must always win over that UI-only throttle so the
    // first visible result cannot claim that an item on another storey is near.
    updateCollectibleDistances(true);

    if (!followPlayer && followGameView) updateCamera(false);

    if (followPlayer) {
      if (!wasOnCurrentMap || resetZoom || !followRadiusInitialized) {
        focusOnPlayer(true);
      } else {
        target.lerp(lastPlayerMapPosition, 0.62);
        updateCamera();
      }
    }
  }

  function updateTrackingState(message) {
    if (message.state === "tracking") return;
    autoProgressAvailable=false;autoCompletedCollectibles={};lastFlagSignature="";
    tourRunning=false;regionCandidate=null;regionSamples=0;
    if(meshes.length){renderImportantItems(currentRouteIndex);refreshTour();}
    if (message.state === "waiting") {
      if (playerGroup) playerGroup.visible = false;
      if (routeGuideLine) routeGuideLine.visible = false;
      if (routeGuideStatus) routeGuideStatus.textContent = tr("waitingForCoordinates", "等待玩家坐标后显示下一目标");
      playerOnCurrentMap = false;
      resetIndoorCut();
      updateCollectibleDistances(true);
      setPlayerStatus(tr("trackingPrefix", "实时定位：") + message.message, "");
      return;
    }
    if (message.state === "unsupported") {
      if (playerGroup) playerGroup.visible = false;
      if (routeGuideLine) routeGuideLine.visible = false;
      if (routeGuideStatus) routeGuideStatus.textContent = tr("unsupportedRoute", "当前游戏版本暂不支持路线定位");
      playerOnCurrentMap = false;
      resetIndoorCut();
      updateCollectibleDistances(true);
      setPlayerStatus(tr("trackingPrefix", "实时定位：") + message.message, "tracking-error");
      return;
    }
    if (playerGroup) playerGroup.visible = false;
    if (routeGuideLine) routeGuideLine.visible = false;
    if (routeGuideStatus) routeGuideStatus.textContent = tr("trackingPaused", "实时定位暂停");
    playerOnCurrentMap = false;
    resetIndoorCut();
    updateCollectibleDistances(true);
    setPlayerStatus(tr("trackingPrefix", "实时定位：") + message.message, "");
  }

  function updateGamepadMode(message) {
    gamepadMode = !!message.enabled;
    document.body.classList.toggle("gamepad-mode", gamepadMode);
    if (gamepadMode) {
      gamepadStatus.textContent = tr("gamepadHelp", "手柄地图模式 · 触摸板切换全屏/小窗 · 左摇杆手动旋转（关闭视角跟随） · L3切换视角跟随 · 右摇杆平移 · L2/LT、R2/RT缩放 · L1/LB、R1/RB切图 · △/Y切换全部标记 · ○/B退出 · 麦克风键切换模式");
    }
  }

  function handleGamepadInput(message) {
    if (!gamepadMode) return;
    var leftX = Number(message.leftX) || 0;
    var leftY = Number(message.leftY) || 0;
    var rightX = Number(message.rightX) || 0;
    var rightY = Number(message.rightY) || 0;
    var leftTrigger = Number(message.leftTrigger) || 0;
    var rightTrigger = Number(message.rightTrigger) || 0;
    var cameraChanged = false;

    if (leftX || leftY) {
      if (followGameView) setFollowGameView(false, true, false);
      theta -= leftX * 0.055;
      phi = Math.max(0.08, Math.min(Math.PI - 0.08, phi - leftY * 0.045));
      cameraChanged = true;
    }

    if (rightX || rightY) {
      if (followPlayer) setFollowPlayer(false, true, false);
      camera.updateMatrix();
      var e = camera.matrix.elements;
      var scale = radius / Math.max(240, viewport.clientHeight);
      target.add(new THREE.Vector3(e[0], e[1], e[2]).multiplyScalar(-rightX * 15 * scale));
      target.add(new THREE.Vector3(e[4], e[5], e[6]).multiplyScalar(rightY * 15 * scale));
      cameraChanged = true;
    }

    var zoom = rightTrigger - leftTrigger;
    if (zoom) {
      radius *= Math.exp(-zoom * 0.075);
      radius = clampZoomRadius(radius);
      cameraChanged = true;
    }

    if (message.toggleFollow) setFollowPlayer(!followPlayer, true, true);
    if (message.toggleRoute) routeButton.click();
    if (message.toggleItems) toggleAllCollectionLayers();
    if (message.toggleView) setFollowGameView(!followGameView, true, true);
    if (message.reset) {
      resetMapView();
      cameraChanged = false;
    }
    if (cameraChanged) {
      mapViewFramed = false;
      updateCamera();
    }
  }

  function setRouteSegmentAppearance(segment, color, opacity, haloOpacity, floorOpacity) {
    var levelOpacity = floorOpacity == null ? 1 : floorOpacity;
    segment.core.material.color.setHex(color);
    segment.core.material.opacity = opacity * levelOpacity;
    segment.halo.material.color.setHex(color);
    segment.halo.material.opacity = haloOpacity * levelOpacity;
  }

  function updateRouteGuidance(position) {
    if (!position || !routeSegments.length || !routeGuideStatus) return;
    var best = null;
    for (var i = 0; i < routeSegments.length; i++) {
      var nearest = closestPointOnPath(position, routeSegments[i].points);
      if (!nearest) continue;
      if (!best || nearest.distanceSquared < best.nearest.distanceSquared) {
        best = { segment: routeSegments[i], nearest: nearest };
      }
    }
    if (!best) return;

    if (best.nearest.remaining < 4) {
      for (var next = 0; next < routeSegments.length; next++) {
        var possible = routeSegments[next];
        if (possible.pathOrder === best.segment.pathOrder &&
          possible.segmentOrder === best.segment.segmentOrder + 1) {
          best = {
            segment: possible,
            nearest: closestPointOnPath(position, possible.points)
          };
          break;
        }
      }
    }

    for (var j = 0; j < routeSegments.length; j++) {
      var segment = routeSegments[j];
      var floorOpacity = routeSegmentFloorOpacity(segment);
      if (segment === best.segment) {
        setRouteSegmentAppearance(segment, 0xffc857, 1, 0.42, floorOpacity);
      } else if (segment.pathOrder === best.segment.pathOrder &&
        segment.segmentOrder < best.segment.segmentOrder) {
        setRouteSegmentAppearance(segment, 0x32747d, 0.34, 0.08, floorOpacity);
      } else if (segment.pathOrder === best.segment.pathOrder) {
        setRouteSegmentAppearance(segment, 0x45d8ff, 0.94, 0.23, floorOpacity);
      } else {
        setRouteSegmentAppearance(segment, 0x2aa876, 0.64, 0.13, floorOpacity);
      }
    }

    for (var rowIndex = 0; rowIndex < routePointRows.length; rowIndex++) {
      routePointRows[rowIndex].classList.toggle("active", rowIndex === best.segment.toIndex);
    }

    var distanceToRoute = Math.sqrt(best.nearest.distanceSquared);
    var targetName = best.segment.toName;
    routeGuideStatus.textContent = tr("nextObjective", "下一目标：") + targetName +
      trDistance("alongRoute", " · 沿路线约 {distance} m", Math.max(0, Math.round(best.nearest.remaining))) +
      (distanceToRoute > 7 ? trDistance("offRoute", " · 偏离路线约 {distance} m", Math.round(distanceToRoute)) : "");

    if (routeGuideLine) {
      routeGuideLine.visible = distanceToRoute > 4;
      if (routeGuideLine.visible) {
        routeGuideLine.geometry.vertices[0].copy(position);
        routeGuideLine.geometry.vertices[0].y += 1.2;
        routeGuideLine.geometry.vertices[1].copy(best.nearest.point);
        routeGuideLine.geometry.vertices[1].y += 1.2;
        routeGuideLine.geometry.verticesNeedUpdate = true;
        routeGuideLine.geometry.computeBoundingSphere();
      }
    }
  }

  function orderedTargets(key, rebuild) {
    if (tourOrder[key] && !rebuild) return tourOrder[key];
    var left = allMapTargets(key).slice(), ordered = [];
    var start = playerOnCurrentMap && lastPlayerMapPosition ? lastPlayerMapPosition.clone() :
      left.length ? gameToMapPosition((left.find(function(t){return t.kind==="bonfire";}) || left[0]).entry.p,0) : new THREE.Vector3();
    while(left.length) {
      var best=0, score=Infinity;
      left.forEach(function(t,i){
        var q=gameToMapPosition(t.entry.p,0);
        var distance=q.distanceToSquared(start)+Math.pow(q.y-start.y,2)*3;
        if(distance<score){score=distance;best=i;}
      });
      var next=left.splice(best,1)[0];ordered.push(next);start=gameToMapPosition(next.entry.p,0);
    }
    tourOrder[key]=ordered; return ordered;
  }
  function remainingTargets(key) {
    return orderedTargets(key).filter(function(t){
      return !collectibleCompleted(key,t.kind,t.entry) && !tourSkipped[collectibleEntryKey(key,t.kind,t.entry)];
    });
  }
  function nextTourTarget() {
    var key=String(recommendedRoute[currentRouteIndex].source);
    var next=remainingTargets(key)[0];
    if(!next){tourRunning=false;clearCollectibleNavigation(true);return;}
    if(!collectibleRouteMatches(key,next.kind,next.entry)) setCollectibleNavigation(key,next.kind,next.entry);
  }
  function refreshTour() {
    if(tourRunning) nextTourTarget();
    if(meshes.length) renderExplorationRoute(currentRouteIndex);
  }
  function renderExplorationRoute(routeIndex) {
    var scroll=routePanel.scrollTop;
    clearExplorationRoute();
    var key=String(recommendedRoute[routeIndex].source), all=orderedTargets(key), remaining=remainingTargets(key);
    explorationRoutes[key]={title:namesZh[Number(key)]+"探索",points:all.map(function(t){return {name:t.entry.name,p:t.entry.p};}),paths:[]};
    routeButton.classList.toggle("active",routeVisible);
    routePanel.style.display=routeVisible ? "block" : "none";
    function textNode(cls,text,parent){var e=document.createElement("div");e.className=cls;e.textContent=text;(parent||routePanel).appendChild(e);return e;}
    textNode("route-title",namesZh[Number(key)]+" · 探索路线");
    textNode("route-note","先按主线／支线推进，再逐点扫图补漏。扫图按距离与楼层排序，门、梯子、升降机和剧情条件请结合游戏判断。");
    var plans=window.DSRExploration.plans[key] || [];
    var details=document.createElement("details");details.open=true;routePanel.appendChild(details);
    var summary=document.createElement("summary");summary.textContent="区域步骤 · "+plans.length+" 段";details.appendChild(summary);
    plans.forEach(function(plan,index){
      var entry={id:"plan-"+key+"-"+index,name:plan[0]};
      var row=textNode("route-step","",details), label=document.createElement("label"), box=document.createElement("input");
      box.type="checkbox";box.checked=collectibleCompleted(key,"plan",entry);
      box.addEventListener("change",function(){toggleCollectibleCompleted(key,"plan",entry);});
      label.appendChild(box);label.appendChild(document.createTextNode((index+1)+". "+plan[0]));row.appendChild(label);
      textNode("route-note",plan[1],row);
    });
    var completed=all.filter(function(t){return collectibleCompleted(key,t.kind,t.entry);}).length;
    var skipped=all.filter(function(t){return !!tourSkipped[collectibleEntryKey(key,t.kind,t.entry)];}).length;
    textNode("route-title","扫图 "+completed+"/"+all.length+" · 剩余 "+remaining.length+" · 暂跳 "+skipped);
    var actions=textNode("tour-actions","");
    function button(id,label,fn){var b=document.createElement("button");b.id=id;b.type="button";b.textContent=label;b.addEventListener("click",fn);actions.appendChild(b);return b;}
    button("tourStart",tourRunning?"暂停扫图":"开始扫图",function(){tourRunning=!tourRunning;if(tourRunning)nextTourTarget();refreshTour();});
    button("tourSkip","暂跳当前",function(){
      var current=collectibleRouteTarget && all.find(function(t){return collectibleRouteMatches(key,t.kind,t.entry);}) || remaining[0];
      if(current)tourSkipped[collectibleEntryKey(key,current.kind,current.entry)]=true;
      if(tourRunning)nextTourTarget();else clearCollectibleNavigation(true);
      refreshTour();
    });
    button("tourRebuild","重新排序",function(){tourSkipped={};orderedTargets(key,true);refreshTour();});
    button("tourPreview",tourPreview?"隐藏全程线":"预览全程线",function(){tourPreview=!tourPreview;refreshTour();});
    routeGroup=new THREE.Object3D();routeGroup.visible=routeVisible;scene.add(routeGroup);
    tourDisconnected=0;
    if(tourPreview && routeVisible) {
      for(var i=1;i<remaining.length;i++){
        var a=gameToMapPosition(remaining[i-1].entry.p,0), b=gameToMapPosition(remaining[i].entry.p,0);
        if(a.distanceTo(b)<0.2)continue;
        var path=navigationPath(a,b);
        if(!path.navigationResolved){tourDisconnected++;continue;}
        var tube=createRouteTube(path,0.7,0.35);routeGroup.add(tube.group);
        routeSegments.push({pathOrder:0,segmentOrder:i-1,fromIndex:i-1,toIndex:i,toName:remaining[i].entry.name,points:path,core:tube.core,halo:tube.halo});
      }
      textNode("route-note","蓝线为几何网格参考路线；"+tourDisconnected+" 段未找到连通路径，已留空。");
    }
    var list=document.createElement("details");routePanel.appendChild(list);
    var listTitle=document.createElement("summary");listTitle.textContent="全部待探索目标（"+remaining.length+"）";list.appendChild(listTitle);
    remaining.forEach(function(t,index){
      var row=document.createElement("button");row.type="button";row.className="tour-target";row.textContent=(index+1)+". "+t.entry.name;
      row.addEventListener("click",function(){tourRunning=false;setCollectibleNavigation(key,t.kind,t.entry);});
      list.appendChild(row);
    });
    textNode("route-note","自动识别只使用真实事件标志。NPC 交谈、篝火与路线步骤请手动勾选；暂跳不会记为完成。固定点数据不涵盖全部敌人掉落、商店和剧情奖励。");
    routePanel.scrollTop=scroll;
  }

  function generatedCollectionForKey(key) {
    if (!window.DSRCollectibles || !window.DSRCollectibles.maps) return null;
    var source = window.DSRCollectibles.maps[key] || (key === "throne" ? window.DSRCollectibles.maps.castle : null);
    if (!source) return null;
    // One shared view keeps map sprites, lists, progress and sweep routes aligned.
    // Retain the source records and completion IDs so saved progress is preserved.
    var collection = {};
    Object.keys(source).forEach(function(category) {
      collection[category] = source[category].filter(function(entry) { return entry.collectible !== false; });
    });
    return collection;
  }

  function generatedSecretsForKey(key) {
    if (!window.DSRSecrets || !window.DSRSecrets.maps) return [];
    return window.DSRSecrets.maps[key] || (key === "throne" ? window.DSRSecrets.maps.castle : []) || [];
  }

  function loadCollectibleState(storageKey) {
    try {
      var saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    } catch (error) {
      return {};
    }
  }

  function saveCompletedCollectibles() {
    try {
      localStorage.setItem(collectibleStateStorageKey, JSON.stringify(completedCollectibles));

      localStorage.setItem(manualIncompleteStorageKey, JSON.stringify(manualIncompleteCollectibles));

    } catch (error) {
      // The overlay still works when storage is unavailable; only persistence is lost.
    }
  }

  function canonicalCollectionKey(key) {
    return key === "throne" ? "castle" : String(key);
  }

  function collectibleEntryKey(mapKey, kind, entry) {
    var identity = entry.lot != null
      ? "lot:" + entry.lot
        : entry.param != null
          ? "param:" + entry.param
          : entry.id != null
            ? "id:" + entry.id
            : "name:" + (entry.nameEn || entry.name || "unknown");
    var position = (entry.p || []).map(function (value) {
      return Math.round(Number(value) * 10) / 10;
    }).join(",");
    return canonicalCollectionKey(mapKey) + "|" + kind + "|" + identity + "|" + position;
  }

  function collectibleCompleted(mapKey, kind, entry) {
    var key = collectibleEntryKey(mapKey, kind, entry);
    return completedCollectibles[key] === true || (!manualIncompleteCollectibles[key] && autoCompletedCollectibles[key] === true);
  }

  function collectibleAutoCompleted(mapKey, kind, entry) {
    return autoCompletedCollectibles[collectibleEntryKey(mapKey, kind, entry)] === true;
  }

  function completedStatusText(kind) {
    var keys = {
      bonfire: ["bonfireCompleted", "已点燃"],
      item: ["itemCompleted", "已获得"],
      weapon: ["itemCompleted", "已获得"],
      ring: ["itemCompleted", "已获得"],
      spell: ["spellCompleted", "已获得"],
      npc: ["npcCompleted", "已见过"],
      secret: ["secretCompleted", "已发现"]
    };
    var value = keys[kind] || keys.weapon;
    return tr(value[0], value[1]);
  }

  function toggleCollectibleCompleted(mapKey, kind, entry) {
    var stateKey = collectibleEntryKey(mapKey, kind, entry);
    if (collectibleCompleted(mapKey, kind, entry)) {
      delete completedCollectibles[stateKey];

      manualIncompleteCollectibles[stateKey] = true;
    } else {
      completedCollectibles[stateKey] = true;

      delete manualIncompleteCollectibles[stateKey];
    }
    saveCompletedCollectibles();
    var previousScroll = itemPanel.scrollTop;
    renderImportantItems(currentRouteIndex);
    itemPanel.scrollTop = previousScroll;
    refreshTour();
  }

  function allMapTargets(key) {
    var data = generatedCollectionForKey(key) || {}, targets = [];
    Object.keys({items:1,bonfires:1,weapons:1,rings:1,spells:1,npcs:1}).forEach(function(category){
      var kind = {items:"item",bonfires:"bonfire",weapons:"weapon",rings:"ring",spells:"spell",npcs:"npc"}[category];
      (data[category] || []).forEach(function(entry){targets.push({mapKey:String(key),kind:kind,entry:entry});});
    });
    generatedSecretsForKey(key).forEach(function(entry){targets.push({mapKey:String(key),kind:"secret",entry:entry});});
    return targets;
  }
  function updateAutoProgress(message) {
    if (!Array.isArray(message.enabledFlags) || !Array.isArray(message.checkedFlags) || !/^slot-[0-9]$/.test(message.profileId || "")) return;
    var signature = message.profileId + ":" + message.enabledFlags.join(",") + "|" + message.checkedFlags.join(",");
    lastFlagSnapshotAt = Date.now();
    if (signature === lastFlagSignature && autoProgressAvailable) return;
    lastFlagSignature = signature;
    if (currentProfile !== message.profileId) {
      currentProfile = message.profileId;
      collectibleStateStorageKey = "dsr-collected-v2-" + currentProfile;
      manualIncompleteStorageKey = "dsr-ignore-v2-" + currentProfile;
      completedCollectibles = loadCollectibleState(collectibleStateStorageKey);
      manualIncompleteCollectibles = loadCollectibleState(manualIncompleteStorageKey);
      tourRunning = false; tourSkipped = {}; tourOrder = {};
      clearCollectibleNavigation(true);
    }
    autoProgressAvailable = true;
    var enabled = new Set(message.enabledFlags), checked = new Set(message.checkedFlags);
    // Rebuild from the current character every time, including negative observations.
    // Consumed items stay complete while cleared flags (new character/NG+) undo auto ticks.
    autoCompletedCollectibles = {};
    autoProgressItemCount = 0; autoProgressBonfireCount = 0;
    Object.keys(window.DSRCollectibles.maps).forEach(function(mapKey){
      allMapTargets(mapKey).forEach(function(target){
        var flag = target.entry.eventFlag;
        if (!checked.has(flag) || !enabled.has(flag)) return;
        autoCompletedCollectibles[collectibleEntryKey(mapKey,target.kind,target.entry)] = true;
        if (target.kind === "bonfire") autoProgressBonfireCount++;
        if (["item","weapon","ring","spell"].indexOf(target.kind) >= 0) autoProgressItemCount++;
      });
    });
    if (meshes.length) {renderImportantItems(currentRouteIndex);refreshTour();}
  }
  function setAutoRegion(value) {
    autoRegion = !!value; regionCandidate = null; regionSamples = 0;
    localStorage.setItem("dsr-auto-region",autoRegion ? "true" : "false");
    var button = document.getElementById("autoRegionButton");
    button.classList.toggle("active",autoRegion);
    button.textContent = autoRegion ? "自动区域" : "手动区域";
    if(autoRegion && lastPlayerMessage) {regionCandidate=Number(lastPlayerMessage.mapId);regionSamples=2;updatePlayerPosition(lastPlayerMessage,false);}
  }

  function renderImportantItems(routeIndex) {
    clearImportantItems();
    var routeEntry = recommendedRoute[routeIndex];
    var key = routeEntry.routeKey || String(routeEntry.source);
    var definition = importantItems[key];
    var collectionKey = canonicalCollectionKey(key);
    var generated = generatedCollectionForKey(key);
    var secrets = generatedSecretsForKey(key);
    if (collectibleRouteTarget && collectibleRouteTarget.mapKey === collectionKey &&
      collectibleCompleted(collectionKey, collectibleRouteTarget.kind, collectibleRouteTarget.entry)) {
      clearCollectibleNavigation(true);
    }
    itemButton.classList.toggle("active", itemVisible);
    bonfireButton.classList.toggle("active", bonfireVisible);
    weaponButton.classList.toggle("active", weaponVisible);
    ringButton.classList.toggle("active", ringVisible);
    spellButton.classList.toggle("active", spellVisible);
    npcButton.classList.toggle("active", npcVisible);
    secretButton.classList.toggle("active", secretVisible);

    var mapSize = bounds.size(new THREE.Vector3());
    var largestDimension = Math.max(mapSize.x, mapSize.y, mapSize.z);
    var lift = Math.max(1.4, Math.min(5, largestDimension * 0.006));
    var markerSize = Math.max(4.5, Math.min(17, largestDimension * 0.027));

    if (definition) {
      itemGroup = new THREE.Object3D();
      itemGroup.visible = itemVisible;
      definition.items.filter(function (entry) { return !!entry.p; }).forEach(function (entry) {
        var markerEntry = Object.assign({}, entry, {
          collectibleCompleted: collectibleCompleted(collectionKey, "important", entry)
        });
        var sprite = makeItemMarker(gameToMapPosition(entry.p, lift), markerSize, markerEntry);
        sprite.userData.collectibleCompleted = markerEntry.collectibleCompleted;
        itemGroup.add(sprite);
      });
      scene.add(itemGroup);
    }

    function makeGeneratedGroup(entries, visible, marker) {
      var group = new THREE.Object3D();
      group.visible = visible;
      (entries || []).forEach(function (entry) {
        var completed = collectibleCompleted(collectionKey, marker, entry);
        var markerEntry = {
          marker: marker,
          collectibleCompleted: completed,
          school: entry.school,
          schoolEn: entry.schoolEn
        };
        var sprite = makeItemMarker(gameToMapPosition(entry.p, lift), markerSize * 0.72, markerEntry);
        sprite.userData.collectibleCompleted = completed;
        sprite.userData.collectibleKey = collectibleEntryKey(collectionKey, marker, entry);
        group.add(sprite);
      });
      scene.add(group);
      return group;
    }

    function makeSecretGroup(entries, visible) {
      var group = new THREE.Object3D();
      group.visible = visible;
      (entries || []).forEach(function (entry) {
        var completed = collectibleCompleted(collectionKey, "secret", entry);
        var style = itemMarkerStyle({ marker: "secret", secretType: entry.type, collectibleCompleted: completed });
        var center = gameToMapPosition(entry.p, lift * 0.55);
        var sprite = makeItemMarker(center.clone().add(new THREE.Vector3(0, lift * 0.55, 0)), markerSize * 0.62, {
          marker: "secret",
          secretType: entry.type,
          collectibleCompleted: completed
        });
        sprite.userData.collectibleCompleted = completed;
        sprite.userData.collectibleKey = collectibleEntryKey(collectionKey, "secret", entry);
        group.add(sprite);

        if (entry.yaw == null) return; // No invented passage direction.
        var yaw = Number(entry.yaw) * Math.PI / 180;
        var direction = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
        var side = new THREE.Vector3(-direction.z, 0, direction.x);
        var lineLength = markerSize * 2.05;
        var wingLength = lineLength * 0.2;
        var start = center.clone().add(direction.clone().multiplyScalar(-lineLength * 0.5));
        var end = center.clone().add(direction.clone().multiplyScalar(lineLength * 0.5));
        var geometry = new THREE.Geometry();
        geometry.vertices.push(start, end);
        geometry.vertices.push(end, end.clone().add(direction.clone().multiplyScalar(-wingLength)).add(side.clone().multiplyScalar(wingLength * 0.55)));
        geometry.vertices.push(end, end.clone().add(direction.clone().multiplyScalar(-wingLength)).add(side.clone().multiplyScalar(-wingLength * 0.55)));
        geometry.vertices.push(start, start.clone().add(direction.clone().multiplyScalar(wingLength)).add(side.clone().multiplyScalar(wingLength * 0.55)));
        geometry.vertices.push(start, start.clone().add(direction.clone().multiplyScalar(wingLength)).add(side.clone().multiplyScalar(-wingLength * 0.55)));
        var line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
          color: style.color,
          transparent: true,
          opacity: completed ? 0.42 : 0.96,
          depthTest: false,
          depthWrite: false
        }));
        line.renderOrder = 12;
        line.userData.floorAware = true;
        line.userData.mapHeight = center.y;
        line.userData.collectibleCompleted = completed;
        line.userData.collectibleKey = collectibleEntryKey(collectionKey, "secret", entry);
        group.add(line);
      });
      scene.add(group);
      return group;
    }

    keyItemGroup = makeGeneratedGroup(generated && generated.items, itemVisible, "item");
    bonfireGroup = makeGeneratedGroup(generated && generated.bonfires, bonfireVisible, "bonfire");
    weaponGroup = makeGeneratedGroup(generated && generated.weapons, weaponVisible, "weapon");
    ringGroup = makeGeneratedGroup(generated && generated.rings, ringVisible, "ring");
    spellGroup = makeGeneratedGroup(generated && generated.spells, spellVisible, "spell");
    npcGroup = makeGeneratedGroup(generated && generated.npcs, npcVisible, "npc");
    secretGroup = makeSecretGroup(secrets, secretVisible);
    renderCollectionPanel(definition, generated, secrets, collectionKey);
    syncCollectibleRouteRows();
    if (collectibleRouteTarget) updateCollectibleNavigation(lastPlayerMapPosition, false);
    updateIndoorMarkerVisibility();
  }

  function localizedCollectibleValue(entry, property) {
    var englishProperty = property + "En";
    return english && entry[englishProperty] ? entry[englishProperty] : entry[property];
  }

  function formatFloorDifference(heightDifference, horizontalDistance) {
    if (!Number.isFinite(heightDifference) || Math.abs(heightDifference) <= 5 ||
        (Number.isFinite(horizontalDistance) && horizontalDistance > 35)) return "";
    var height = Math.round(Math.abs(heightDifference));
    return heightDifference > 0
      ? tr("floorAbove", "↑ 上层 {height} 米").replace("{height}", String(height))
      : tr("floorBelow", "↓ 下层 {height} 米").replace("{height}", String(height));
  }

  function formatCollectibleDistance(distance, heightDifference, horizontalDistance) {
    if (!Number.isFinite(distance)) return "";
    var base = distance >= 1000
      ? (distance / 1000).toFixed(1) + " km"
      : Math.round(distance) + " " + tr("distanceUnit", "米");
    var floor = formatFloorDifference(heightDifference, horizontalDistance);
    return floor ? base + " · " + floor : base;
  }

  function updateCollectibleDistances(force) {
    var now = Date.now();
    if (!force && now - lastCollectibleDistanceUpdate < 350) return;
    lastCollectibleDistanceUpdate = now;
    collectibleRows.forEach(function (record) {
      var distance = null;
      var heightDifference = null;
      var horizontalDistance = null;
      if (playerOnCurrentMap && lastPlayerMapPosition && record.entry.p) {
        var targetPosition = gameToMapPosition(record.entry.p, 0);
        distance = lastPlayerMapPosition.distanceTo(targetPosition);
        heightDifference = targetPosition.y - lastPlayerMapPosition.y;
        horizontalDistance = Math.hypot(
          targetPosition.x - lastPlayerMapPosition.x,
          targetPosition.z - lastPlayerMapPosition.z
        );
      }
      record.distance.textContent = formatCollectibleDistance(distance, heightDifference, horizontalDistance);
      var otherFloor = Number.isFinite(heightDifference) && Math.abs(heightDifference) > 5 &&
        Number.isFinite(horizontalDistance) && horizontalDistance <= 35;
      record.row.classList.toggle("other-floor", otherFloor);
      record.row.classList.toggle("higher-floor", otherFloor && heightDifference > 0);
      record.row.classList.toggle("lower-floor", otherFloor && heightDifference < 0);
      record.row.classList.toggle("nearby", Number.isFinite(distance) && distance <= 25 && !otherFloor);
    });
  }

  function appendCollectibleSection(kind, entries, mapKey) {
    if (!entries || !entries.length) return false;
    var section = document.createElement("div");
    section.className = "collectible-section";
    var title = document.createElement("div");
    title.className = "collectible-section-title " + kind;
    var titleKeys = { item: "keyItemSection", bonfire: "bonfireSection", weapon: "weaponSection", ring: "ringSection", spell: "spellSection", npc: "npcSection", secret: "secretSection" };
    var titleFallbacks = { item: "重要道具与防具", bonfire: "篝火", weapon: "武器与盾牌", ring: "戒指", spell: "法术、奇迹与咒术", npc: "NPC", secret: "隐藏入口" };
    var titleKey = titleKeys[kind] || "npcSection";
    var titleFallback = titleFallbacks[kind] || "NPC";
    var completedCount = entries.filter(function (entry) {
      return collectibleCompleted(mapKey, kind, entry);
    }).length;
    title.textContent = tr(titleKey, titleFallback) + " · " + completedCount + "/" + entries.length;
    section.appendChild(title);

    entries.forEach(function (entry) {
      var row = document.createElement("div");
      row.className = "collectible-row";
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      var completed = collectibleCompleted(mapKey, kind, entry);
      var automaticallyCompleted = collectibleAutoCompleted(mapKey, kind, entry);
      row.classList.toggle("completed", completed);
      row.classList.toggle("auto-completed", automaticallyCompleted);
      row.classList.toggle("drop-source", entry.sourceKind === "enemy-drop" || entry.sourceKind === "mixed-drop");
      row.classList.toggle("route-target", collectibleRouteMatches(mapKey, kind, entry));
      row.setAttribute("aria-pressed", completed ? "true" : "false");
      row.title = completed
        ? (automaticallyCompleted ? tr("unmarkAutoCompleted", "已自动识别；点击取消并停止自动重标") : tr("unmarkCompleted", "点击取消完成标记"))
        : tr("routeIncompleteCollectible", "点击生成路线；Shift+点击手动标记为已获得/已发现");
      var symbol = document.createElement("span");
      var rowStyle = itemMarkerStyle(Object.assign({}, entry, { marker: kind, collectibleCompleted: completed }));
      symbol.className = "collectible-symbol " + (entry.sourceKind ? rowStyle.className : kind);
      symbol.textContent = completed ? "✓" : entry.sourceKind ? rowStyle.symbol : kind === "item" ? "I" : kind === "weapon" ? "W" : kind === "spell" ? "S" : kind === "secret" ? "↔" : kind === "ring" || kind === "bonfire" ? "" : "N";
      if (entry.sourceKind && !completed) symbol.style.background = rowStyle.color;
      if (kind === "spell" && !completed) {
        symbol.style.background = itemMarkerStyle({ marker: "spell", schoolEn: entry.schoolEn }).color;
      }
      if (kind === "secret" && !completed) {
        symbol.style.background = itemMarkerStyle({ marker: "secret", secretType: entry.type }).color;
      }
      row.appendChild(symbol);
      var name = document.createElement("span");
      name.className = "collectible-name";
      name.textContent = localizedCollectibleValue(entry, "name");
      row.appendChild(name);
      var distance = document.createElement("span");
      distance.className = "collectible-distance";
      row.appendChild(distance);
      var meta = document.createElement("span");
      meta.className = "collectible-meta";
      var metaText = kind === "secret"
        ? (localizedCollectibleValue(entry, "action") || entry.method || "隐藏入口")
        : kind === "npc"
        ? (localizedCollectibleValue(entry, "role") || "剧情候选位置")
        : kind === "spell"
          ? localizedCollectibleValue(entry, "school") + " · " + localizedCollectibleValue(entry, "source")
          : (localizedCollectibleValue(entry, "source") || (kind === "bonfire" ? "篝火位置" : ""));
      meta.textContent = metaText + (completed ? " · " + completedStatusText(kind) : "") +
        (automaticallyCompleted ? " · " + tr("autoDetected", "自动识别") : "");
      row.appendChild(meta);
      var hintText = localizedCollectibleValue(entry, "hint") || entry.note;
      if (hintText) {
        var locationHint = document.createElement("span");
        locationHint.className = "collectible-hint";
        locationHint.textContent = hintText;
        row.appendChild(locationHint);
      }
      row.addEventListener("click", function (event) {
        if (completed || event.shiftKey) toggleCollectibleCompleted(mapKey, kind, entry);
        else setCollectibleNavigation(mapKey, kind, entry);
      });
      row.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (completed || event.shiftKey || event.key === " ") toggleCollectibleCompleted(mapKey, kind, entry);
        else setCollectibleNavigation(mapKey, kind, entry);
      });
      section.appendChild(row);
      collectibleRows.push({ row: row, distance: distance, entry: entry, mapKey: mapKey, kind: kind });
    });
    itemPanel.appendChild(section);
    return true;
  }

  function renderCollectionPanel(definition, generated, secrets, mapKey) {
    itemPanel.innerHTML = "";
    collectibleRows = [];
    var hasContent = false;

    if (itemVisible && definition) {
      hasContent = true;
      var title = document.createElement("div");
      title.className = "item-title";
      title.textContent = definition.title;
      itemPanel.appendChild(title);
      var legend = document.createElement("div");
      legend.className = "item-legend";
      legend.textContent = tr("itemLegend", "区域探索提示，点击标记完成。清单不代表全收集或精确拾取位置。");
      itemPanel.appendChild(legend);
      definition.items.forEach(function (entry) {
        var style = itemMarkerStyle(entry);
        var row = document.createElement("div");
        row.className = "item-point";
        row.classList.toggle("drop-source", entry.sourceKind === "enemy-drop" || entry.sourceKind === "mixed-drop");
        var completed = collectibleCompleted(mapKey, "important", entry);
        var automaticallyCompleted = collectibleAutoCompleted(mapKey, "important", entry);
        row.classList.toggle("completed", completed);
        row.setAttribute("aria-pressed", completed ? "true" : "false");
        row.setAttribute("data-important-id", entry.id);
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.title = completed
          ? tr("unmarkCompleted", "点击取消完成标记")
          : entry.itemIdGroups
            ? tr("routeIncompleteCollectible", "点击生成路线；Shift+点击手动标记为已获得/已发现")
            : tr("sourceReminder", "点击标记完成，再次点击取消");
        row.addEventListener("click", function (event) {
          if (!entry.p || completed || event.shiftKey) toggleCollectibleCompleted(mapKey, "important", entry);
          else if (entry.p) setCollectibleNavigation(mapKey, "important", entry);
        });
        row.addEventListener("keydown", function (event) {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          if (!entry.p || completed || event.shiftKey || event.key === " ") toggleCollectibleCompleted(mapKey, "important", entry);
          else if (entry.p) setCollectibleNavigation(mapKey, "important", entry);
        });
        if (entry.p) {
          row.setAttribute("data-route-identity", collectibleRouteIdentity(mapKey, "important", entry));
          row.classList.toggle("route-target", collectibleRouteMatches(mapKey, "important", entry));
        }
        var symbol = document.createElement("span");
        symbol.className = "item-symbol " + style.className;
        symbol.textContent = completed ? "✓" : style.symbol;
        row.appendChild(symbol);
        row.appendChild(document.createTextNode(entry.name + " · " + entry.type + (entry.precision === "area" ? " · " + tr("area", "区域") : "")));
        var state = document.createElement("span");
        state.className = "item-note";
        var stateParts = [];
        if (entry.sourceKind === "enemy-drop") stateParts.push(tr("enemyDropSource", "敌人掉落 · 区域来源（非固定拾取点）"));
        if (entry.sourceKind === "mixed-drop") stateParts.push(tr("mixedDropSource", "Boss魂兑换／敌人掉落 · 区域来源（非固定拾取点）"));
        if (completed) {
          stateParts.push(completedStatusText("important") + (automaticallyCompleted ? " · " + tr("autoDetected", "自动识别") : ""));
        } else if (!entry.itemIdGroups && !entry.sourceKind) {
          stateParts.push(tr("sourceReminderLabel", "点击标记完成"));
        }
        state.textContent = stateParts.join(" · ");
        row.appendChild(state);
        if (entry.note) {
          var note = document.createElement("span");
          note.className = "item-note";
          note.textContent = entry.note;
          row.appendChild(note);
        }
        itemPanel.appendChild(row);
      });
    }

    if ((itemVisible || bonfireVisible || weaponVisible || ringVisible || spellVisible || npcVisible || secretVisible) && (generated || (secrets && secrets.length))) {
      var generatedLegend = document.createElement("div");
      generatedLegend.className = "item-legend collectible-section";
      generatedLegend.textContent = tr("collectibleLegend", "I＝重要道具/防具 · B＝篝火 · W＝武器/盾牌 · 金环＝戒指 · S＝法术 · N＝NPC · ↔＝隐藏入口；点击清单导航，Shift+点击记录完成");
      itemPanel.appendChild(generatedLegend);
      var autoStatus = document.createElement("div");
      autoStatus.className = "auto-progress-status";
      autoStatus.textContent = autoProgressAvailable
        ? tr("autoProgressActive", "自动识别已开启") + " · " + autoProgressItemCount + " " + tr("inventoryIds", "个已拾取标记") +
          " · 按独立拾取事件判断"
        : tr("autoProgressWaiting", "自动识别：等待进入游戏存档；当前可手动记录");
      itemPanel.appendChild(autoStatus);
      var profileStatus=document.createElement("div");profileStatus.className="auto-progress-status";
      profileStatus.textContent=currentProfile==="manual"?"记录：离线手动清单":"记录：存档槽 "+(Number(currentProfile.split("-")[1])+1);
      itemPanel.appendChild(profileStatus);
      var resetManual=document.createElement("button");resetManual.type="button";resetManual.textContent="重置本槽手动记录";
      resetManual.title="新周目或更换此槽角色时，可重置手动勾选和忽略项；自动状态仍以游戏为准";
      resetManual.addEventListener("click",function(){
        if(!window.confirm("重置当前清单的手动勾选和自动识别忽略项？游戏存档与其他槽位的记录不受影响。"))return;
        completedCollectibles={};manualIncompleteCollectibles={};saveCompletedCollectibles();
        renderImportantItems(currentRouteIndex);refreshTour();
      });
      itemPanel.appendChild(resetManual);
      var autoLimits = document.createElement("div");
      autoLimits.className = "auto-progress-status";
      autoLimits.textContent = tr("autoProgressLimits", "仅显示收集目标：普通消耗品、箭矢和常见强化材料已隐藏。固定点不包含全部商店、随机掉落及剧情奖励。");
      itemPanel.appendChild(autoLimits);
      hasContent = appendCollectibleSection("item", itemVisible && generated ? generated.items : [], mapKey) || hasContent;
      hasContent = appendCollectibleSection("bonfire", bonfireVisible && generated ? generated.bonfires : [], mapKey) || hasContent;
      hasContent = appendCollectibleSection("weapon", weaponVisible && generated ? generated.weapons : [], mapKey) || hasContent;
      hasContent = appendCollectibleSection("ring", ringVisible && generated ? generated.rings : [], mapKey) || hasContent;
      hasContent = appendCollectibleSection("spell", spellVisible && generated ? generated.spells : [], mapKey) || hasContent;
      hasContent = appendCollectibleSection("npc", npcVisible && generated ? generated.npcs : [], mapKey) || hasContent;
      hasContent = appendCollectibleSection("secret", secretVisible ? secrets : [], mapKey) || hasContent;
    }

    var anyLayerVisible = itemVisible || bonfireVisible || weaponVisible || ringVisible || spellVisible || npcVisible || secretVisible;
    if (anyLayerVisible && !hasContent) {
      var unavailable = document.createElement("div");
      unavailable.className = "item-title";
      unavailable.textContent = tr("noCollectibles", "此地图在已开启分类中暂无标记");
      itemPanel.appendChild(unavailable);
    }
    itemPanel.style.display = anyLayerVisible ? "block" : "none";
    updateCollectionLayout();
    updateCollectibleDistances(true);
  }

  function navigationDiagnostics() {
    if (!navigationGraph || !navigationGraph.nodes.length) return null;
    var component = new Int32Array(navigationGraph.nodes.length);
    for (var i = 0; i < component.length; i++) component[i] = -1;
    var sizes = [];
    for (var start = 0; start < component.length; start++) {
      if (component[start] >= 0) continue;
      var componentId = sizes.length;
      var size = 0;
      var stack = [start];
      component[start] = componentId;
      while (stack.length) {
        var current = stack.pop();
        size += 1;
        var neighbors = navigationGraph.nodes[current].neighbors;
        for (var n = 0; n < neighbors.length; n++) {
          var neighborId = neighbors[n].id;
          if (component[neighborId] >= 0) continue;
          component[neighborId] = componentId;
          stack.push(neighborId);
        }
      }
      sizes.push(size);
    }

    var routeEntry = recommendedRoute[currentRouteIndex];
    var key = routeEntry.routeKey || String(routeEntry.source);
    var route = explorationRoutes[key];
    var landmarks = route ? route.points.map(function (point) {
      var position = gameToMapPosition(point.p, 0);
      var nodeId = closestNavigationNode(position);
      return {
        name: point.name,
        node: nodeId,
        component: nodeId >= 0 ? component[nodeId] : -1,
        componentSize: nodeId >= 0 ? sizes[component[nodeId]] : 0,
        snapDistance: nodeId >= 0 ? navigationGraph.nodes[nodeId].position.distanceTo(position) : null
      };
    }) : [];
    var sortedSizes = sizes.slice().sort(function (a, b) { return b - a; });
    return {
      components: sizes.length,
      largestComponents: sortedSizes.slice(0, 12),
      landmarks: landmarks
    };
  }

  function parseGeometry(arrayBuffer, using) {
    var data = new Uint8Array(arrayBuffer);
    var numModels = new Uint32Array(data.buffer.slice(0, 4))[0];
    var chunks = using.chunks || Array.apply(null, { length: numModels }).map(Number.call, Number);
    var triangleBounds = using.tris || chunks.map(function () { return null; });
    var geometries = [];

    for (var chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      var i = chunks[chunkIndex];
      var range = triangleBounds[chunkIndex] || [null, null];
      var modelData = new Uint32Array(data.buffer.slice(16 * (i + 1), 16 * (i + 1) + 16));
      var trisOffset = modelData[0];
      var numTris = modelData[1] / 3;
      var vertsOffset = modelData[2];
      var numVerts = modelData[3];
      var verts = new Float32Array(data.buffer.slice(vertsOffset, vertsOffset + numVerts * 12));
      var tris = new Uint16Array(data.buffer.slice(trisOffset, trisOffset + numTris * 6));
      var start = range[0] == null ? 0 : range[0];
      var end = range[1] == null ? numTris : range[1];
      var positions = new Float32Array((end - start) * 9);

      for (var j = start; j < end; j++) {
        for (var k = 0; k < 9; k++) {
          positions[9 * (j - start) + k] = verts[3 * tris[3 * j + Math.floor(k / 3)] + k % 3];
        }
      }

      var vertexNumber = new Float32Array(positions.length / 3);
      for (var vertex = 0; vertex < vertexNumber.length; vertex++) {
        vertexNumber[vertex] = vertex % 3;
      }

      var geometry = new THREE.BufferGeometry();
      geometry.addAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.addAttribute("vertexNumber", new THREE.BufferAttribute(vertexNumber, 1));
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometries.push(geometry);
    }

    return geometries;
  }

  function loadUsing(using, token) {
    return fetch(encodeURI(using.filename))
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.arrayBuffer();
      })
      .then(function (arrayBuffer) {
        if (token !== loadToken) return;
        var geometries = parseGeometry(arrayBuffer, using);
        for (var i = 0; i < geometries.length; i++) {
          var mesh = new THREE.Mesh(geometries[i], material);
          addNavigationGeometry(geometries[i]);
          meshes.push(mesh);
          scene.add(mesh);
          bounds.union(geometries[i].boundingBox);
        }
      });
  }

  function loadMap(index) {
    index = Math.max(0, Math.min(recommendedRoute.length - 1, Number(index) || 0));
    loadToken += 1;
    var token = loadToken;
    var routeEntry = recommendedRoute[index];
    if(currentRouteIndex !== index) tourRunning=false;
    currentRouteIndex = index;
    var info = Config.ds1[routeEntry.source];
    mapSelect.value = String(index);
    localStorage.setItem("dsr-overlay-route-map-v3", String(index));
    disposeMeshes();
    setStatus(tr("loading", "正在加载：") + routeEntry.label);

    Promise.all(info.using.map(function (using) { return loadUsing(using, token); }))
      .then(function () {
        if (token !== loadToken) return;
        stitchNavigationGraph();
        frameCurrentMap();
        renderExplorationRoute(index);
        renderImportantItems(index);
        if (lastPlayerMessage) updatePlayerPosition(lastPlayerMessage, true);
        setStatus(routeEntry.label + tr("loaded", " · 已载入"));
        var routeKey = routeEntry.routeKey || String(routeEntry.source);
        var routeDefinition = explorationRoutes[routeKey];
        var itemDefinition = importantItems[routeKey];
        var collectibleDefinition = generatedCollectionForKey(routeKey);
        var secretDefinition = generatedSecretsForKey(routeKey);
        postHost("map-loaded", {
          map: routeEntry.label,
          meshCount: meshes.length,
          routePointCount: routeDefinition ? routeDefinition.points.length : 0,
          itemCount: itemDefinition ? itemDefinition.items.length : 0,
          keyItemCount: collectibleDefinition && collectibleDefinition.items ? collectibleDefinition.items.length : 0,
          bonfireCount: collectibleDefinition ? collectibleDefinition.bonfires.length : 0,
          weaponCount: collectibleDefinition ? collectibleDefinition.weapons.length : 0,
          ringCount: collectibleDefinition ? collectibleDefinition.rings.length : 0,
          spellCount: collectibleDefinition ? collectibleDefinition.spells.length : 0,
          npcCount: collectibleDefinition ? collectibleDefinition.npcs.length : 0,
          secretCount: secretDefinition.length
        });
      })
      .catch(function (error) {
        if (token !== loadToken) return;
        setStatus(tr("mapLoadFailed", "地图加载失败：") + error.message);
        postHost("map-error", { message: error.message });
      });
  }

  function populateMapList() {
    for (var i = 0; i < recommendedRoute.length; i++) {
      var option = document.createElement("option");
      option.value = String(i);
      option.textContent = recommendedRoute[i].label + " / " + Config.ds1[recommendedRoute[i].source].name;
      mapSelect.appendChild(option);
    }
  }

  renderer.domElement.addEventListener("mousedown", function (event) {
    dragMode = event.button === 2 ? 2 : 1;
    lastX = event.clientX;
    lastY = event.clientY;
    event.preventDefault();
  });

  window.addEventListener("mousemove", function (event) {
    if (!dragMode) return;
    var dx = event.clientX - lastX;
    var dy = event.clientY - lastY;
    if (dx || dy) mapViewFramed = false;
    lastX = event.clientX;
    lastY = event.clientY;

    if (dragMode === 1) {
      if (followGameView) setFollowGameView(false, true, false);
      theta -= dx * 0.008;
      phi = Math.max(0.08, Math.min(Math.PI - 0.08, phi + dy * 0.008));
    } else {
      if (followPlayer) setFollowPlayer(false, true, false);
      camera.updateMatrix();
      var e = camera.matrix.elements;
      var scale = radius / Math.max(240, viewport.clientHeight);
      target.add(new THREE.Vector3(e[0], e[1], e[2]).multiplyScalar(-dx * scale));
      target.add(new THREE.Vector3(e[4], e[5], e[6]).multiplyScalar(dy * scale));
    }
    updateCamera();
  });

  window.addEventListener("mouseup", function () { dragMode = 0; });
  renderer.domElement.addEventListener("contextmenu", function (event) { event.preventDefault(); });
  renderer.domElement.addEventListener("dblclick", function () {
    resetMapView();
  });
  renderer.domElement.addEventListener("wheel", function (event) {
    radius *= Math.exp(event.deltaY * 0.001);
    radius = clampZoomRadius(radius);
    mapViewFramed = false;
    updateCamera();
    event.preventDefault();
  }, { passive: false });

  mapSelect.addEventListener("change", function () {
    setAutoRegion(false); loadMap(mapSelect.value); });
  compactButton.addEventListener("click", function () { postHost("compact"); });
  resetButton.addEventListener("click", resetMapView);
  edgeButton.addEventListener("click", function () {
    material.uniforms.edgeHighlight.value = material.uniforms.edgeHighlight.value ? 0 : 1;
    edgeButton.classList.toggle("active", !!material.uniforms.edgeHighlight.value);
  });
  routeButton.addEventListener("click", function () {
    routeVisible = !routeVisible;
    localStorage.setItem("dsr-overlay-route-visible", routeVisible ? "true" : "false");
    routeButton.classList.toggle("active", routeVisible);
    if (routeGroup) routeGroup.visible = routeVisible;
    routePanel.style.display = routeVisible ? "block" : "none";
  });

  function refreshCollectionPanel() {
    var routeEntry = recommendedRoute[currentRouteIndex];
    var key = routeEntry.routeKey || String(routeEntry.source);
    var generated = generatedCollectionForKey(key);
    var secrets = generatedSecretsForKey(key);
    renderCollectionPanel(importantItems[key], generated, secrets, canonicalCollectionKey(key));
  }

  function setGeneratedLayerVisibility(kind, visible, persist) {
    if (kind === "bonfire") {
      bonfireVisible = visible;
      bonfireButton.classList.toggle("active", bonfireVisible);
      if (bonfireGroup) bonfireGroup.visible = bonfireVisible;
      if (persist) localStorage.setItem("dsr-overlay-bonfire-visible", bonfireVisible ? "true" : "false");
    }
    if (kind === "weapon") {
      weaponVisible = visible;
      weaponButton.classList.toggle("active", weaponVisible);
      if (weaponGroup) weaponGroup.visible = weaponVisible;
      if (persist) localStorage.setItem("dsr-overlay-weapon-visible", weaponVisible ? "true" : "false");
    }
    if (kind === "ring") {
      ringVisible = visible;
      ringButton.classList.toggle("active", ringVisible);
      if (ringGroup) ringGroup.visible = ringVisible;
      if (persist) localStorage.setItem("dsr-overlay-ring-visible", ringVisible ? "true" : "false");
    }
    if (kind === "spell") {
      spellVisible = visible;
      spellButton.classList.toggle("active", spellVisible);
      if (spellGroup) spellGroup.visible = spellVisible;
      if (persist) localStorage.setItem("dsr-overlay-spell-visible", spellVisible ? "true" : "false");
    }
    if (kind === "npc") {
      npcVisible = visible;
      npcButton.classList.toggle("active", npcVisible);
      if (npcGroup) npcGroup.visible = npcVisible;
      if (persist) localStorage.setItem("dsr-overlay-npc-visible", npcVisible ? "true" : "false");
    }
    if (kind === "secret") {
      secretVisible = visible;
      secretButton.classList.toggle("active", secretVisible);
      if (secretGroup) secretGroup.visible = secretVisible;
      if (persist) localStorage.setItem("dsr-overlay-secret-visible", secretVisible ? "true" : "false");
    }
  }

  function toggleAllCollectionLayers() {
    var visible = !(itemVisible && bonfireVisible && weaponVisible && ringVisible && spellVisible && npcVisible && secretVisible);
    itemVisible = visible;
    localStorage.setItem("dsr-overlay-item-visible", visible ? "true" : "false");
    itemButton.classList.toggle("active", itemVisible);
    if (itemGroup) itemGroup.visible = itemVisible;
    if (keyItemGroup) keyItemGroup.visible = itemVisible;
    setGeneratedLayerVisibility("bonfire", visible, true);
    setGeneratedLayerVisibility("weapon", visible, true);
    setGeneratedLayerVisibility("ring", visible, true);
    setGeneratedLayerVisibility("spell", visible, true);
    setGeneratedLayerVisibility("npc", visible, true);
    setGeneratedLayerVisibility("secret", visible, true);
    refreshCollectionPanel();
  }

  itemButton.addEventListener("click", function () {
    itemVisible = !itemVisible;
    localStorage.setItem("dsr-overlay-item-visible", itemVisible ? "true" : "false");
    itemButton.classList.toggle("active", itemVisible);
    if (itemGroup) itemGroup.visible = itemVisible;
    if (keyItemGroup) keyItemGroup.visible = itemVisible;
    refreshCollectionPanel();
  });
  bonfireButton.addEventListener("click", function () {
    setGeneratedLayerVisibility("bonfire", !bonfireVisible, true);
    refreshCollectionPanel();
  });
  weaponButton.addEventListener("click", function () {
    setGeneratedLayerVisibility("weapon", !weaponVisible, true);
    refreshCollectionPanel();
  });
  ringButton.addEventListener("click", function () {
    setGeneratedLayerVisibility("ring", !ringVisible, true);
    refreshCollectionPanel();
  });
  spellButton.addEventListener("click", function () {
    setGeneratedLayerVisibility("spell", !spellVisible, true);
    refreshCollectionPanel();
  });
  npcButton.addEventListener("click", function () {
    setGeneratedLayerVisibility("npc", !npcVisible, true);
    refreshCollectionPanel();
  });
  secretButton.addEventListener("click", function () {
    setGeneratedLayerVisibility("secret", !secretVisible, true);
    refreshCollectionPanel();
  });
  followButton.addEventListener("click", function () {
    setFollowPlayer(!followPlayer, true, true);
  });
  viewButton.addEventListener("click", function () {
    setFollowGameView(!followGameView, true, true);
  });
  interiorButton.addEventListener("click", function () {
    setIndoorCutEnabled(!indoorCutEnabled, true);
  });
  languageButton.addEventListener("click", function () {
    var nextLanguage = english ? "zh-CN" : "en";
    if (window.chrome && window.chrome.webview) {
      postHost("set-language", { language: nextLanguage });
      return;
    }
    var nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("lang", nextLanguage);
    window.location.replace(nextUrl.toString());
  });
  lockButton.addEventListener("click", function () { postHost("toggle-lock"); });
  hideButton.addEventListener("click", function () { postHost("hide"); });

  window.dsrOverlay = {
    loadMap: loadMap,
    cycleMap: function (delta) {
      setAutoRegion(false);
      var current = Number(mapSelect.value) || 0;
      var next = (current + Number(delta) + recommendedRoute.length) % recommendedRoute.length;
      loadMap(next);
    },
    reset: resetMapView,
    updatePlayerPosition: updatePlayerPosition,
    updateAutoProgress: updateAutoProgress,
    setTrackingState: updateTrackingState,
    setAutoRegion: setAutoRegion,
    followPlayer: function (enabled) { setFollowPlayer(enabled, true, true); },
    followGameView: function (enabled) { setFollowGameView(enabled, true, true); },
    indoorCut: function (enabled) { setIndoorCutEnabled(enabled, true); },
    setWindowMode: updateHostWindowMode,
    setGamepadMode: updateGamepadMode,
    handleGamepadInput: handleGamepadInput,
    diagnostics: function () {
      return {
        mapIndex: currentRouteIndex,
        layout: {
          viewportWidth: viewport.clientWidth,
          viewportHeight: viewport.clientHeight,
          cameraAspect: camera.aspect,
          itemSidebarVisible: document.body.classList.contains("has-item-sidebar")
        },
        player: {
          visible: !!(playerGroup && playerGroup.visible && playerOnCurrentMap),
          headingRadians: playerHeading,
          headingDegrees: Number.isFinite(playerHeading)
            ? ((playerHeading * 180 / Math.PI) % 360 + 360) % 360
            : null,
          directionVisible: !!(playerDirectionMarker && playerDirectionMarker.visible),
          screenRotation: playerDirectionMarker ? playerDirectionMarker.material.rotation : null,
          status: playerStatus.textContent
        },
        camera: {
          gameHeadingRadians: gameCameraHeading,
          gameHeadingDegrees: Number.isFinite(gameCameraHeading)
            ? ((gameCameraHeading * 180 / Math.PI) % 360 + 360) % 360
            : null,
          followGameView: followGameView,
          desiredTheta: theta,
          actualTheta: cameraActualTheta,
          actualPhi: cameraActualPhi,
          radius: radius,
          followingPlayer: followPlayer,
          mapViewFramed: mapViewFramed,
          overviewRadius: mapOverviewRadius,
          framing: mapFraming,
          hostWindowExpanded: hostWindowExpanded,
          expandedRangeScale: expandedRangeScale,
          avoidanceActive: cameraAvoidanceActive,
          lineOfSightClear: cameraLineOfSightClear,
          avoidanceIndex: cameraAvoidanceIndex,
          distance: camera.position.distanceTo(target),
          screenForwardAngle: gameCameraScreenAngle()
        },
        indoor: {
          enabled: indoorCutEnabled,
          active: indoorCutActive,
          evidence: indoorCutEvidence,
          ceilingDistance: indoorCeilingDistance,
          cutHeight: indoorCutHeight,
          cutRadius: indoorCutRadius,
          shaderEnabled: material.uniforms.indoorCut.value === 1
        },
        floorAwareness: floorAwarenessDiagnostics(),
        autoProgress: {
          available: autoProgressAvailable,
          detectedPickups: autoProgressItemCount,
          profile: currentProfile,
          acquiredItemIds: Object.keys(acquiredItemIds).length,
          litBonfires: autoProgressBonfireCount,
          completed: Object.keys(completedCollectibles).length,
          automaticallyCompleted: Object.keys(autoCompletedCollectibles).length,
          manualOverrides: Object.keys(manualIncompleteCollectibles).length
        },
        exploration: {
          autoRegion:autoRegion, running:tourRunning,
          targets:orderedTargets(String(recommendedRoute[currentRouteIndex].source)).length,
          remaining:remainingTargets(String(recommendedRoute[currentRouteIndex].source)).length,
          disconnectedSegments:tourDisconnected,
          steps:(window.DSRExploration.plans[String(recommendedRoute[currentRouteIndex].source)] || []).length
        },
        secrets: {
          visible: secretVisible,
          currentMap: generatedSecretsForKey((recommendedRoute[currentRouteIndex].routeKey || String(recommendedRoute[currentRouteIndex].source))).length,
          renderedObjects: secretGroup ? secretGroup.children.length : 0
        },
        collectibleRoute: {
          active: !!collectibleRouteTarget,
          target: collectibleRouteTarget ? collectibleRouteTarget.name : null,
          targetEventFlag: collectibleRouteTarget ? collectibleRouteTarget.entry.eventFlag || null : null,
          targetKind: collectibleRouteTarget ? collectibleRouteTarget.kind : null,
          pathPoints: collectibleRoutePath.length,
          navigationResolved: collectibleRoutePath.length ? collectibleRoutePath.navigationResolved !== false : null,
          renderedObjects: collectibleRouteGroup ? collectibleRouteGroup.children.length : 0
        },
        navigationNodes: navigationGraph ? navigationGraph.nodes.length : 0,
        navigation: navigationDiagnostics(),
        routeSegments: routeSegments.map(function (segment) {
          return {
            from: segment.fromIndex,
            to: segment.toIndex,
            pathPoints: segment.points.length,
            distance: segment.points.reduce(function (total, point, index) {
              return index ? total + segment.points[index - 1].distanceTo(point) : total;
            }, 0)
          };
        })
      };
    },
    setHostLocked: function (locked) {
      document.body.classList.toggle("host-locked", !!locked);
      updateCollectionLayout();
    }
  };

  function animate() {
    requestAnimationFrame(animate);
    if (playerMarker && playerGroup && playerGroup.visible) {
      var pulse = 1 + Math.sin(Date.now() * 0.006) * 0.09;
      playerMarker.scale.set(playerMarkerBaseSize * pulse, playerMarkerBaseSize * pulse, 1);
      updatePlayerMarkerRotation();
    }
    renderer.render(scene, camera);
  }

  document.getElementById("hint").textContent = "左拖旋转 · 右拖平移 · 滚轮缩放 · 双击复位 · Ctrl+Alt+F 全图";
  [languageButton, viewButton].forEach(function(b){b.hidden=true;});
  itemButton.textContent = "清单";
  itemButton.title = "显示区域探索清单（手动完成记录）";
  followButton.title = "视角跟随角色；区域切换由自动区域按钮控制";
  document.getElementById("autoRegionButton").addEventListener("click",function(){setAutoRegion(!autoRegion);});
  setAutoRegion(autoRegion);
  setInterval(function(){
    if(autoProgressAvailable && Date.now()-lastFlagSnapshotAt>5000) {
      autoProgressAvailable=false;autoCompletedCollectibles={};lastFlagSignature="";
      renderImportantItems(currentRouteIndex);refreshTour();
    }
  },1000);
  populateMapList();
  // Backfill newly trackable rows from prior read-only observations even
  // while the game is closed. This is not a fresh live-process snapshot.

  applyIndoorCutUniforms();
  setFollowPlayer(followPlayer, false, false);
  setFollowGameView(followGameView, false, false);
  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.addEventListener("message", function (event) {
      var message = event.data;
      if (typeof message === "string") {
        try { message = JSON.parse(message); } catch (_) { return; }
      }
      if (!message || !message.action) return;
      if (message.action === "player-position") updatePlayerPosition(message, false);
      if (message.action === "auto-progress") updateAutoProgress(message);
      if (message.action === "tracking-state") updateTrackingState(message);
      if (message.action === "gamepad-mode") updateGamepadMode(message);
      if (message.action === "gamepad-input") handleGamepadInput(message);
      if (message.action === "window-mode") updateHostWindowMode(message);
    });
  }
  window.addEventListener("error", function (event) {
    postHost("script-error", { message: event.message || tr("unknownScriptError", "未知脚本错误") });
  });
  resize();
  window.addEventListener("resize", resize);
  if (typeof ResizeObserver !== "undefined") {
    var viewportResizeObserver = new ResizeObserver(resize);
    viewportResizeObserver.observe(viewport);
  }
  var savedRouteValue = localStorage.getItem("dsr-overlay-route-map-v3");
  if (savedRouteValue === null) {
    var legacyRouteValue = localStorage.getItem("dsr-overlay-route-map-v2");
    if (legacyRouteValue !== null) {
      var legacyRouteIndex = Number(legacyRouteValue);
      if (legacyRouteIndex === 22) legacyRouteIndex = 26;
      else if (legacyRouteIndex === 23) legacyRouteIndex = 27;
      else if (legacyRouteIndex === 24) legacyRouteIndex = 28;
      if (Number.isFinite(legacyRouteIndex)) savedRouteValue = String(legacyRouteIndex);
    }
  }
  var savedRouteIndex = Number(savedRouteValue);
  loadMap(savedRouteValue !== null && Number.isFinite(savedRouteIndex) ? savedRouteIndex : 1);
  animate();
}());
