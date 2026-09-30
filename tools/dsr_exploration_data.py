"""Curated DS1 landmarks; coordinates/flags resolved from installed MSB/EMEVD.

Reference semantics: soulstruct-vanilla DS1R events and DS1PTDE enums.
NPC positions are story candidates, not assertions that an NPC is currently alive.
"""
import json, struct
from collections import Counter

NPC_NAMES={600:'太阳战士索拉尔',601:'暗月女骑士（防火女）',602:'奥斯卡',603:'大帽子罗根',604:'古利格斯',605:'乌拉席露的幽暗',606:'亚娜斯塔西娅（防火女）',607:'圣女蕾亚',608:'佩特鲁斯',609:'尼可',610:'文斯',611:'太阳公主葛温艾薇雅',612:'黯影太阳葛温德林',613:'咒术师劳伦提斯',615:'白蜘蛛（混沌的女儿）',616:'恩吉',617:'伊扎里斯的克拉娜',618:'封印者英果德',619:'铁匠安德烈',620:'铁匠巴摩斯',621:'巨人铁匠',622:'铁匠李凯尔特',623:'不死商人（女）',624:'不死商人（男）',625:'心灰意冷的商人',626:'杰纳的多姆纳尔',627:'心灰意冷的战士',628:'洋葱骑士杰克迈雅',629:'杰克琳德',630:'女神的骑士罗特雷克',631:'东方的芝',632:'帕奇',633:'世界大蛇芙拉姆特',634:'世界大蛇卡斯',636:'半龙普利希拉',637:'卡利姆的奥斯瓦尔德',638:'白猫亚尔薇娜',642:'东方芝的随从',645:'鸟巢交换（闪闪／软软）',646:'墓王尼特（契约）',647:'石之古龙',648:'太阳战士祭坛',658:'索拉尔（废都剧情分支）',670:'奇妙的切斯特',672:'鹰眼戈夫',673:'伊丽莎白',674:'王刃基亚兰'}

NPC_NAMES.update({623:'不死商人（男）',624:'不死商人（女）'})

# map, object ID, event flag, title, action. Slots verified in vanilla scripts;
# the local event must also exist before its flag is trusted.
WALLS=[
 ('m12_00_00_01',1201300,11200120,'黑森林庭院 · 隐藏篝火','攻击或翻滚撞击墙壁，显露庭院篝火。'),
 ('m14_00_00_00',1401200,11400210,'克拉格的住处 · 白蜘蛛密室','第二口钟下方的圆形房间；攻击幻影墙，通往白蜘蛛与恩吉。'),
 ('m13_02_00_00',1321200,11320200,'大树洞入口 · 第一重幻影墙','病村大树根内，击破墙壁后仍有第二重隐藏墙。'),
 ('m13_02_00_00',1321201,11320201,'大树洞入口 · 第二重幻影墙','宝箱后方再击破墙壁，进入大树洞；这是向下的可选分支。'),
 ('m13_00_00_00',1301050,11300160,'地下墓地 · 隐藏通道','攻击这处可破坏墙壁，检查后方的通路。'),
 ('m13_01_00_00',1311400,11310100,'巨人墓地 · 隐藏通道','攻击幻影墙；留意黑暗与落差，备好照明。'),
 ('m14_01_00_00',1411360,11410360,'废都伊扎里斯 · 岩浆塔篝火','攻击岩浆区域建筑的幻影墙，进入隐藏篝火。'),
 ('m15_01_00_00',1511210,11510215,'亚诺尔隆德 · 壁炉密室','银骑士建筑内的壁炉幻影墙；后方有哈维尔装备与宝箱怪。'),
 ('m12_01_00_00',1211200,11210200,'乌拉席露 · 光照密门 1','在门前使用太阳虫、头盖骨提灯或照明魔法；普通攻击不能开启。'),
 ('m12_01_00_00',1211201,11210201,'乌拉席露 · 光照密门 2','在门前使用太阳虫、头盖骨提灯或照明魔法。'),
 ('m12_01_00_00',1211240,11210025,'深渊洞穴 · 希夫隐藏通道','跟随幼年亚尔薇娜，攻击这处幻影墙，进入救援希夫的支线。'),
]

# Each region has an ordered main/optional exploration plan. These are directions,
# not straight-line geometry. Fixed pickups are a separate complete sweep queue.
PLANS={
16:[('初访：离开牢房','取牢房钥匙 → 中庭篝火 → 从恶魔左侧门绕行。'),('奥斯卡与教学区','躲开滚球，与奥斯卡交谈取得原素瓶与钥匙；拾取初始装备。'),('不死院恶魔 → 鸟巢','从上层雾门进入战斗，出大门到悬崖前往祭祀场。'),('返访分支','从祭祀场鸟巢回来，探索牢房取得奇异人偶，使用西侧二层钥匙取生锈铁环；离群恶魔可后期挑战。')],
8:[('建立补给点','点燃篝火，与失落战士、佩特鲁斯及出现的 NPC 对话。'),('环绕祭祀场收集','检查水池、遗迹、墓地与升降梯周边；地下防火女处可强化原素瓶。'),('主线：水道 → 不死镇','从山坡水道进入不死镇；小隆德和地下墓地是另外的分支。'),('返访与捷径','教区升降梯开放后可登上鸟巢返回不死院；敲钟、救人和王器进度会改变 NPC 位置。')],
17:[('不死镇上层','篝火 → 不死商人 → 牛头恶魔；哈维尔塔楼为有钥匙时的分支。'),('飞龙桥 → 教区','见索拉尔，开启踢梯捷径；桥下经鼠道到教区，太阳祭坛为可选点。'),('教堂与安德烈','开启祭祀场升降梯，救罗特雷克，拜访安德烈；教堂楼顶石像鬼后敲第一口钟。'),('下层不死镇','用地下室钥匙进入下层，救古利格斯，山羊头恶魔后取得底层钥匙；女商人水道捷径可回祭祀场。')],
6:[('厨房与上层水道','救劳伦提斯，检查屠夫旁宝箱与大块余烬；准备解毒与解除诅咒。'),('篝火与排水道','找房间篝火并打开连接上层的门；老鼠、咒蛙区域有落差和岔路。'),('贪食魔龙 → 病村','清理高处法师，检查多姆纳尔；击败魔龙获得病村钥匙。')],
2:[('上层木架','从底层大门下降，依次检查平台、梯子与桥上的拾取点；不要把上下层距离当成可直行。'),('沼泽篝火与支线','到沼泽篝火；探索大树根入口，克拉娜与东方芝是否出现取决于剧情。'),('克拉格与第二口钟','进入白色洞穴挑战克拉格，敲第二口钟，再找白蜘蛛幻影墙。'),('水车返程','经水车向上，找小隆德遗迹钥匙；从飞龙之谷／小隆德返回祭祀场。')],
4:[('庭院与隐藏篝火','从安德烈处进入，找徽章门旁幻影墙；月光蝶分支取得神圣余烬。'),('夹缝森林与九头蛇','探索山坡、黑骑士与底部篝火；湖水边缘有深渊落差。'),('希夫与契约','徽章门或湖边梯子进入庭院深处，找亚尔薇娜，挑战希夫取得亚尔特留斯的契约。'),('幽暗／DLC 前置','击败九头蛇后重载区域，救金色结晶怪中的幽暗；之后去书库取得破损项链，再回湖后传送点。')],
14:[('机关大厅','敲响两口钟后进入；经过摆斧、蛇人与滚石楼梯。'),('中层分支','调整滚石方向，检查罗根囚室与贪欲金蛇戒指路线；下层楔形石恶魔区为可选。'),('屋顶与篝火','从屋顶边缘落到隐藏篝火；探索商人、笼子钥匙与笼梯捷径。'),('钢铁巨偶','先处理投掷火球的巨人；胜利后触摸光环前往亚诺尔隆德。')],
0:[('大阶梯与绘画大厅','篝火 → 扶壁 → 房梁 → 旋转楼梯；有奇异人偶时可进入绘画世界。'),('银骑士建筑','通过弓箭手平台，抵达室内篝火和索拉尔；检查洋葱骑士、壁炉密室。'),('巨人铁匠与王器','开启大厅捷径，挑战翁斯坦与斯摩；上楼取得王器。'),('暗月分支','旋转楼梯降至底层，暗月灵庙戒指可开启葛温德林入口；是否挑战由你决定。')],
13:[('外墙与庭院','从篝火沿建筑探索，开大门形成回路；有毒敌人死亡时保持距离。'),('地下井与附楼','探索车轮骷髅地下道，转动机关；找到别馆钥匙后探索别馆与余烬。'),('长桥与出口','经开放的大桥到普利希拉；可以和平离开，战斗和断尾为可选分支。')],
10:[('上层小隆德','从祭祀场下行，准备暂时诅咒；探索鬼屋屋顶找到英果德。'),('放水与下层','取得封印钥匙，开闸放水；检查下层宝箱、巨大余烬与黑暗骑士。'),('四王','先从希夫取得并装备亚尔特留斯的契约，再进入深渊；卡斯路线还受王器交付对象影响。'),('飞龙之谷分支','连接病村、夹缝森林与小隆德；桥与山崖上的道具需另外绕行。')],
3:[('首个篝火与机关','逐段清理死灵法师，转动桥梁；神圣武器可帮助控制复活骷髅。'),('隐藏通道与支线','检查桥边隐藏篝火和可破坏墙，寻找暗月灵庙戒指；石棺可进入墓王契约分支。'),('巴摩斯与底层','从螺旋阶梯分支下降到铁匠，进入车轮骷髅层。'),('三人尸术师','击败首领取得注火秘法，从梯子进入巨人墓地。')],
15:[('照明与第一篝火','准备头盖骨提灯、太阳虫或照明魔法；沿巨型石棺逐层下降。'),('帕奇与蕾亚','探索帕奇陷阱下方并救蕾亚；再沿梯子返回，检查隐藏通道。'),('第二篝火与金色封印','探索巨兽区与下方通路；需要已放置王器才能通过金色封印。'),('墓王尼特','经洞穴到尼特；沿途余烬、戒指与拾取点可单独逐点导航。')],
7:[('书库初访','放置王器解除金色封印；书库初战希斯后进入监牢。'),('监牢逃脱','取得钥匙，探索底层牢房与罗根线索；从上层门返回书库。'),('旋转楼梯与阳台','调整两座旋转楼梯，找阳台篝火、隐藏书柜、宝箱与庭院入口。'),('结晶洞穴','看落雪判断隐形地面，路线线条不保证隐形桥已安全对齐；摧毁结晶后挑战希斯。'),('罗根返访','完成罗根买卖与对话后回访最初希斯房间，处理法术与大块法术余烬分支。')],
5:[('恶魔遗迹入口','从白蜘蛛区域向下；击败持续溃烂的生物使岩浆退去。'),('火焰司祭与百足恶魔','沿遗迹下行；金色封印需放置王器，百足战后取得焦黑橘色戒指。'),('废都岩浆区','装备戒指穿过岩浆，找塔内隐藏篝火；沿树根进入废都内部。'),('剧情与捷径分支','洋葱骑士、索拉尔和混沌仆人捷径均有条件；不要把候选 NPC 标记当成已出现。'),('混沌的温床','检查建筑与树根分支后到达首领雾门；崩塌地板需要自行判断。')],
1:[('两重幻影墙','从病村的大树根依次打破两堵墙进入大树洞。'),('大树洞下降','沿树枝、梯子和平台分层收集；咒蛙与结晶蜥蜴分支可回访，不建议直接朝标记跳落。'),('灰烬湖','抵达沙滩篝火，沿湖岸与树根探索九头蛇附近的拾取点。'),('石之古龙','沿沙洲到末端古龙，契约与尾部武器为可选；回程可用篝火菜单。')],
11:[('灵庙圣兽与灵庙','从幽暗传送入口到圣兽战，进入灵庙篝火并见伊丽莎白。'),('王家御苑','探索高低层与两座升降梯，开启回路；在亚尔特留斯前见切斯特。'),('亚尔特留斯与市镇','胜利后可见基亚兰；探索市镇、两处光照密门与牢房钥匙。'),('戈夫／黑龙分支','带钥匙回竞技场上方塔楼见戈夫；触发黑龙相关剧情后再挑战喀拉弥特。'),('深渊洞穴','从市镇地下到深渊；探索希夫救援支线，然后挑战马努斯并回访幽暗。')],
9:[('王器与封印','向王器献上四份王魂／碎片，打开最终区域。'),('黑骑士道路','沿阶梯与灰烬道路收集黑骑士装备；逐点扫图会列出剩余固定拾取点。'),('乌薪王葛温','进入最终战前完成 DLC、契约、强化与收集；结局后直接进入下一周目。')],
12:[('可选竞技场','乌拉席露竞技场仅供联机对战；不列入单机收集完成率。')]
}

def extend(root,data,mapping,result):
 secrets={str(k):[] for k in mapping.values()}
 registrations={}
 for m,events in data['scripts'].items():
  for e in events:
   for ins in e['instructions']:
    if ins['Bank']==2009 and ins['ID']==3 and len(ins['args'])>=16:
     flag,obj=struct.unpack('<ii',bytes.fromhex(ins['args'])[:8])
     if flag>0 and obj>0:registrations[obj]=flag
 for mid,key in mapping.items():
  out=result[str(key)]; seen=set()
  for p in data['maps'][mid]['parts']:
   tid=p['talk']%1000 if p['talk']>0 else -1
   if tid==645 and mid!='m18_01_00_00':continue # Firelink's unused trading-bird placeholder.
   name=NPC_NAMES.get(tid)
   if p['EntityID']==6051:name=NPC_NAMES[605]
   if not name or (p['ModelName']=='c1000' and tid not in [606,612,645,648]):continue
   identity=(name,tuple(round(n,1) for n in p['p']))
   if identity in seen:continue
   seen.add(identity)
   out['npcs'].append({'id':mid+':npc:'+p['Name'],'name':name,'p':p['p'],'entityId':p['EntityID'],'type':'NPC／交互点','note':'剧情候选位置；出现、存活及敌对状态取决于存档进度。到达不自动记为已交谈，Shift+点击手动记录。','provenance':'本机 MSB 对话实体；NPC 名称按对话 ID 核对'})
  for fire in out['bonfires']:
   if fire['entityId'] in registrations:fire['registrationFlag']=registrations[fire['entityId']]
   fire['note']='篝火对象位置；点燃状态由 Shift+点击手动记录。剧情可能影响是否可用。'
  # Oolacile's o0200 proxies for arena matchmaking/spawns are not ordinary bonfires.
  if key==11:out['bonfires']=[f for f in out['bonfires'] if f['entityId'] not in [1211666,1211510,1211511,1211512,1211513,1211514,1211515]]
 for mid,eid,flag,name,note in WALLS:
  p=next(p for p in data['maps'][mid]['parts'] if p['EntityID']==eid)
  scriptmid='m12_00_00_00' if mid=='m12_00_00_01' else mid
  # Parameterized events have consecutive slot flags.
  base=11210200 if flag in [11210200,11210201] else 11320200 if flag in [11320200,11320201] else flag
  assert any(e['ID']==base for e in data['scripts'][scriptmid]), (mid,flag)
  secrets[str(mapping[mid])].append({'id':mid+':secret:'+str(eid),'name':name,'p':p['p'],'eventFlag':flag,'type':'light' if eid in [1211200,1211201] else 'illusory','note':note,'method':note,'provenance':'本机 MSB 对象；EMEVD 隐藏入口事件'})
 # These models are explicitly named hidden doors in the local Paramdex.
 # Their object-destruction persistence is not an EMEVD flag: completion is manual.
 for mid,model,label,note in [
  ('m11_00_00_00','o1610','绘画世界地下 · 幻影墙','在地下迷宫中攻击墙壁，检查后方通道。'),
  ('m15_00_00_00','o5130','塞恩古城 · 巨人塔隐藏梯道','从底层长梯爬上后攻击墙壁；后方梯子通往巨人所在处。'),
  ('m16_00_00_00','o6700','小隆德下层 · 隐藏房间','放水后探索下层，攻击墙壁进入隐藏房间。'),
 ]:
  for p in data['maps'][mid]['parts']:
   if p['ModelName']!=model:continue
   secrets[str(mapping[mid])].append({'id':mid+':secret:'+p['Name'],'name':label,'p':p['p'],'type':'illusory','method':note,'note':note+' 此入口暂由 Shift+点击记录完成。','provenance':'本机 MSB；Paramdex ObjectParam 隐藏门模型'})
 # Gates requiring equipment/keys: real interaction-region positions, no guessed opening flag.
 for mid,rid,name,note in [
  ('m15_01_00_00',1512410,'暗月灵庙 · 葛温德林入口','佩戴暗月灵庙戒指可使雕像消失；剧情变化也可能开放。'),
 ]:
  p=next((p for p in data['maps'][mid]['regions'] if p['EntityID']==rid),None)
  if p:secrets[str(mapping[mid])].append({'id':mid+':region:'+str(rid),'name':name,'p':p['p'],'type':'gate','method':note,'note':note})
 (root/'js/Secrets.generated.js').write_text('window.DSRSecrets = '+json.dumps({'maps':secrets},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
 (root/'js/Exploration.generated.js').write_text('window.DSRExploration = '+json.dumps({'plans':PLANS,'mapIds':{str(int(m[1:3])*100+int(m[4:6])):k for m,k in mapping.items()}},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
 flags=sorted({e['eventFlag'] for m in list(result.values())+[{'secrets':v} for v in secrets.values()] for rows in m.values() for e in rows if e.get('eventFlag',0)>0})
 (root/'js/event-flags.json').write_text(json.dumps(flags),encoding='utf-8')
 return {'npcs':sum(len(v['npcs']) for v in result.values()),'secrets':sum(map(len,secrets.values())),'plans':len(PLANS),'eventFlags':len(flags),'bonfireRegistrations':sum('registrationFlag' in e for v in result.values() for e in v['bonfires']),'excludedArenaProxies':12}
