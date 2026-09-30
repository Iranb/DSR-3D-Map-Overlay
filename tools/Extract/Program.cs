using SoulsFormats;
using System.Text.Json;
using System.Text;
// Offline extraction tool: GPL-3.0, see LICENSE beside this source.
Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
if(args.Length != 3) throw new ArgumentException("Usage: Extract <game-directory> <Paramdex-DS1R-Defs-directory> <output.json>");
var game = Path.GetFullPath(args[0]);
var defs = Path.GetFullPath(args[1]);
var maps = new Dictionary<string,object>();
foreach(var file in Directory.GetFiles(Path.Combine(game,"map","MapStudio"),"*.msb")) {
 var m=MSB1.Read(file);
 maps[Path.GetFileNameWithoutExtension(file)]=new {
 parts=m.Parts.GetEntries().Select(p=>new {p.Name,p.ModelName,p.EntityID,p=new[]{p.Position.X,p.Position.Y,p.Position.Z},type=p.GetType().Name,npc=p is MSB1.Part.Enemy e?e.NPCParamID:-1,talk=p is MSB1.Part.Enemy e2?e2.TalkID:-1}),
 treasures=m.Events.Treasures.Select(t=>new{t.Name,t.TreasurePartName,t.ItemLots}),
 regions=m.Regions.GetEntries().Select(r=>new{r.Name,r.EntityID,p=new[]{r.Position.X,r.Position.Y,r.Position.Z}}),
 events=m.Events.GetEntries().Select(e=>new{type=e.GetType().Name,e.Name,e.EntityID})};
}
var parameters=new Dictionary<string,object>();
foreach(var f in BND3.Read(Path.Combine(game,"param","GameParam","GameParam.parambnd.dcx")).Files){
 var name=Path.GetFileNameWithoutExtension(f.Name.Replace('\\','/'));
 if(!new[]{"ItemLotParam","EquipParamGoods","NpcParam"}.Contains(name))continue;
 var p=PARAM.Read(f.Bytes);p.ApplyParamdef(PARAMDEF.XmlDeserialize(Path.Combine(defs,name+".xml")));
 parameters[name]=p.Rows.Select(r=>new{r.ID,cells=r.Cells.ToDictionary(c=>c.Def.InternalName,c=>c.Value)});
}
var texts=new Dictionary<string,object>();
foreach(var file in Directory.GetFiles(Path.Combine(game,"msg","SCHINESE"),"*.dcx")){
 foreach(var f in BND3.Read(file).Files){
  if(!f.Name.EndsWith(".fmg"))continue;
  texts[Path.GetFileName(f.Name.Replace('\\','/'))]=FMG.Read(f.Bytes).Entries.Select(e=>new{e.ID,e.Text});
 }
}
var scripts=new Dictionary<string,object>();
foreach(var file in Directory.GetFiles(Path.Combine(game,"event"),"*.emevd*")) {
 var script=EMEVD.Read(file);
 scripts[Path.GetFileName(file).Split('.')[0]]=script.Events.Select(e=>new{e.ID,instructions=e.Instructions.Select(i=>new{i.Bank,i.ID,args=Convert.ToHexString(i.ArgData)})});
}
File.WriteAllText(args[2],JsonSerializer.Serialize(new{maps,parameters,texts,scripts}));
Console.WriteLine($"Exported {maps.Count} maps, {parameters.Count} params, {texts.Count} text tables.");
