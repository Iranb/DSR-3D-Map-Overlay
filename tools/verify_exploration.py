import json, threading, http.server, functools
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
errors=[];report={}
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='msedge',headless=True)
 page=browser.new_page(viewport={'width':1440,'height':960})
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.goto(f'http://127.0.0.1:{server.server_port}/overlay.html')
 page.wait_for_function("window.dsrOverlay && document.querySelector('#status').textContent.includes('已载入')")
 assert page.locator('#npcButton').is_visible() and page.locator('#secretButton').is_visible()
 coverage=[]
 for index in range(18):
  page.select_option('#mapSelect',str(index))
  page.wait_for_function("(i)=>dsrOverlay.diagnostics().mapIndex===i && document.querySelector('#status').textContent.includes('已载入')",arg=index)
  d=page.evaluate('dsrOverlay.diagnostics()')
  assert d['exploration']['steps']>0
  assert d['exploration']['targets']>0 or index==17
  coverage.append({'index':index,'targets':d['exploration']['targets'],'steps':d['exploration']['steps'],'secrets':d['secrets']['currentMap']})
  print('Map',index,'OK',flush=True)
 report['maps']=coverage
 # Manual browsing must stay put; three stable samples switch on automatic mode.
 page.evaluate("dsrOverlay.updatePlayerPosition({x:-51.8,y:-60.1,z:55.7,mapId:1002})")
 assert page.evaluate('dsrOverlay.diagnostics().mapIndex')==17
 page.evaluate("dsrOverlay.setAutoRegion(true)")
 page.wait_for_function("dsrOverlay.diagnostics().mapIndex===1 && document.querySelector('#status').textContent.includes('已载入')")
 page.evaluate("dsrOverlay.updatePlayerPosition({x:-51.8,y:-60.1,z:55.7,mapId:1002})")
 assert page.evaluate('dsrOverlay.diagnostics().player.visible')
 page.select_option('#mapSelect','2')
 page.wait_for_function("dsrOverlay.diagnostics().mapIndex===2 && document.querySelector('#status').textContent.includes('已载入')")
 page.evaluate("dsrOverlay.updatePlayerPosition({x:-51.8,y:-60.1,z:55.7,mapId:1002})")
 assert page.evaluate('dsrOverlay.diagnostics().mapIndex')==2
 page.evaluate("dsrOverlay.setAutoRegion(true)")
 page.wait_for_function("dsrOverlay.diagnostics().mapIndex===1 && document.querySelector('#status').textContent.includes('已载入')")
 page.evaluate("dsrOverlay.updatePlayerPosition({x:-51.8,y:-60.1,z:55.7,mapId:1002})")
 report['regionSwitch']='automatic follows Firelink, manual browsing stable'
 flags=page.evaluate("Object.values(DSRCollectibles.maps).flatMap(m=>Object.values(m).flat()).concat(Object.values(DSRSecrets.maps).flat()).map(x=>x.eventFlag).filter(f=>f>0)")
 item=page.evaluate("DSRCollectibles.maps['8'].items.find(x=>x.eventFlag>0 && x.collectible!==false)")
 def snapshot(enabled,profile='slot-0'):
  page.evaluate("msg=>dsrOverlay.updateAutoProgress(msg)",{'profileId':profile,'checkedFlags':flags,'enabledFlags':enabled})
 snapshot([])
 baseline=page.evaluate('dsrOverlay.diagnostics().exploration.remaining')
 snapshot([item['eventFlag']])
 assert page.evaluate('dsrOverlay.diagnostics().autoProgress.detectedPickups')>=1
 assert page.evaluate('dsrOverlay.diagnostics().exploration.remaining')<baseline
 snapshot([])
 assert page.evaluate('dsrOverlay.diagnostics().exploration.remaining')==baseline
 snapshot([item['eventFlag']],'slot-1')
 assert page.evaluate('dsrOverlay.diagnostics().autoProgress.profile')=='slot-1'
 snapshot([],'slot-0')
 assert page.evaluate('dsrOverlay.diagnostics().autoProgress.automaticallyCompleted')==0
 # Manual completion/override is per character; proximity alone never completes NPCs.
 row=page.locator('#itemPanel .collectible-row').first
 row.click(modifiers=['Shift'])
 manual=page.evaluate('dsrOverlay.diagnostics().autoProgress.completed')
 assert manual==1
 snapshot([],'slot-1');assert page.evaluate('dsrOverlay.diagnostics().autoProgress.completed')==0
 snapshot([],'slot-0');assert page.evaluate('dsrOverlay.diagnostics().autoProgress.completed')==manual
 report['flags']='negative snapshots, independent pickup flags and slot separation passed'
 # Sweep is exhaustive; skipped targets do not become completed.
 page.locator('#tourStart').click()
 assert page.evaluate('dsrOverlay.diagnostics().exploration.running')
 before=page.evaluate('dsrOverlay.diagnostics()')
 page.locator('#tourSkip').click()
 after=page.evaluate('dsrOverlay.diagnostics()')
 assert after['exploration']['remaining']==before['exploration']['remaining']-1
 assert after['autoProgress']['completed']==before['autoProgress']['completed']
 page.locator('#tourRebuild').click()
 assert page.evaluate('dsrOverlay.diagnostics().exploration.remaining')==before['exploration']['remaining']
 target=page.evaluate('dsrOverlay.diagnostics().collectibleRoute')
 for _ in range(20):
  if target['targetEventFlag']:break
  page.locator('#tourSkip').click()
  target=page.evaluate('dsrOverlay.diagnostics().collectibleRoute')
 assert target['targetEventFlag']
 snapshot([target['targetEventFlag']])
 assert page.evaluate('dsrOverlay.diagnostics().collectibleRoute.target')!=target['target']
 report['tourAdvance']='exact flag completion advances to next target'
 page.locator('#tourPreview').click()
 report['preview']=page.evaluate('dsrOverlay.diagnostics().exploration')
 page.screenshot(path=str(root/'tools/exploration-qa.png'))
 # A disconnected target must never be drawn as a straight walkable route.
 page.evaluate("""() => {
   DSRCollectibles.maps['8'].items.unshift({id:'test-disconnected',name:'离线不连通测试目标',p:[10000,10000,10000]});
   dsrOverlay.loadMap(1);
 }""")
 page.wait_for_function("document.querySelector('#status').textContent.includes('已载入')")
 page.locator('.collectible-row').filter(has_text='离线不连通测试目标').click()
 assert page.evaluate('dsrOverlay.diagnostics().collectibleRoute.pathPoints')==0
 assert '未找到连通路径' in page.locator('#collectibleRouteStatus').inner_text()
 report['disconnectedRoute']='target remains marked; no false straight-line route'
 assert not errors,errors
 report['scriptErrors']=errors
 (root/'tools/exploration-test-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(report,ensure_ascii=False))
 browser.close()
server.shutdown()
