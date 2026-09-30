"""Read-only DS1R marker generation from local MSB, PARAM and Chinese FMG exports."""
import json
from pathlib import Path
from collections import Counter

root=Path(__file__).resolve().parents[1]
data=json.loads((root/'tools/game-data.json').read_text(encoding='utf-8'))
mapping={'m10_00_00_00':6,'m10_01_00_00':17,'m10_02_00_00':8,'m11_00_00_00':13,'m12_00_00_01':4,'m12_01_00_00':11,'m13_00_00_00':3,'m13_01_00_00':15,'m13_02_00_00':1,'m14_00_00_00':2,'m14_01_00_00':5,'m15_00_00_00':14,'m15_01_00_00':0,'m16_00_00_00':10,'m17_00_00_00':7,'m18_00_00_00':9,'m18_01_00_00':16}
texts={k:{r['ID']:r['Text'] for r in v if r['Text']} for k,v in data['texts'].items()}
lots={r['ID']:r['cells'] for r in data['parameters']['ItemLotParam']}
goods={r['ID']:r['cells'] for r in data['parameters']['EquipParamGoods']}
categories={0:('weapons','Weapon_name_.fmg'),0x10000000:('items','Armor_name_.fmg'),0x20000000:('rings','Accessory_name_.fmg'),0x40000000:('items','Item_name_.fmg')}
def is_collectible(cat,iid,kind):
 # The local weapon FMG confirms 2xxxxxx are arrows/bolts, not equipment.
 if cat==0:return not 2000000<=iid<3000000
 if cat!=0x40000000 or kind=='spells':return True
 item=goods.get(iid,{})
 # Keys/embers, reusable tools, unique goods (including Fire Keeper Souls),
 # and rare slabs remain. Routine consumables and other materials are hidden.
 return (item.get('goodsType')==1 or item.get('isConsume')==0 or
         item.get('maxNum')==1 or iid in {1070,1080,1090,1100})
result={};unresolved=[];excluded=Counter()
for mapid,key in mapping.items():
 m=data['maps'][mapid];parts={p['Name']:p for p in m['parts']}
 out={k:[] for k in ['items','bonfires','weapons','rings','spells','npcs']};result[str(key)]=out
 seen=set()
 for t in m['treasures']:
  if '救済' in t['Name']:excluded['recovery-chest']+=1;continue
  p=parts.get(t['TreasurePartName'])
  if not p:unresolved.append([mapid,t['Name'],'missing part']);continue
  for lotid in t['ItemLots']:
   if lotid<0:continue
   lot=lots.get(lotid)
   if not lot:unresolved.append([mapid,lotid,'missing lot']);continue
   for slot in range(1,9):
    suffix=f'{slot:02}';iid=lot['lotItemId'+suffix];cat=lot['lotItemCategory'+suffix]
    if iid<=0 or lot['lotItemBasePoint'+suffix]<=0:continue
    kind,table=categories.get(cat,('items','Item_name_.fmg'))
    if cat==0x40000000 and goods.get(iid,{}).get('magicId',-1)>=0:kind='spells'
    name=texts.get(table,{}).get(iid)
    if not name:unresolved.append([mapid,lotid,iid,cat,'missing name']);continue
    identity=(p['Name'],cat,iid)
    if identity in seen:continue
    seen.add(identity)
    amount=lot['lotItemNum'+suffix]
    if amount>1:name+=f' ×{amount}'
    flag=lot.get('getItemFlagId',-1)
    out[kind].append({'id':f'{mapid}:{p["Name"]}:{cat}:{iid}','name':name,'p':p['p'],'itemId':iid,'collectible':is_collectible(cat,iid,kind),'eventFlag':flag,'school':'法术','type':'固定拾取点','source':'固定拾取点','provenance':'MSB Treasure → ItemLotParam → 简体中文 FMG','note':'尸体／宝箱拾取位置；条件触发与剧情变化可能影响是否出现。Shift+点击记录完成。'})
 # o0200 is the bonfire object; duplicate state variants share one physical location.
 seenfire=set()
 for p in m['parts']:
  if p['ModelName']!='o0200' or p['type']!='Object':continue
  pos=tuple(round(v,2) for v in p['p'])
  if pos in seenfire:continue
  seenfire.add(pos)
  out['bonfires'].append({'id':f'{mapid}:{p["Name"]}','name':f'篝火 {len(seenfire)}','p':p['p'],'entityId':p['EntityID'],'note':'当前安装版本的篝火对象位置；是否可用取决于剧情状态。'})
from dsr_exploration_data import extend
extensions=extend(root,data,mapping,result)
(root/'js/Collectibles.generated.js').write_text('window.DSRCollectibles = '+json.dumps({'maps':result},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
report={'counts':dict(Counter({k:sum(len(m[k]) for m in result.values()) for k in ['items','weapons','rings','spells','bonfires','npcs']})),'unresolved':unresolved,'excluded':dict(excluded),'coordinateTransform':'game XYZ -> mesh ZYX; verified against local collision geometry'}
report['extensions']=extensions
report['collectionView']={'visible':{k:sum(sum(e.get('collectible',True) for e in m[k]) for m in result.values()) for k in ['items','weapons','rings','spells','bonfires','npcs']},'hiddenOrdinaryPickups':sum(sum(e.get('collectible') is False for entries in m.values() for e in entries) for m in result.values()),'policy':'Equipment, spells, keys/embers, reusable/unique goods and slabs; ordinary consumables, ammunition and common materials hidden.'}
(root/'tools/marker-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False)[:2000])
