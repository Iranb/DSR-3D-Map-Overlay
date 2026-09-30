using DSRMapOverlay;
using System.Reflection.PortableExecutable;
using System.Diagnostics;
using System.Text.Json;
static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
Check(EventFlagCodec.TryLocate(909,out var offset,out var mask)&&offset==0x70&&mask==0x40000,"initialization flag");
Check(EventFlagCodec.TryLocate(11000992,out offset,out mask)&&offset==0xA7C&&mask==0x80000000,"bonfire layout");
Check(EventFlagCodec.TryLocate(51000000,out offset,out mask)&&offset==0x6400&&mask==0x80000000,"pickup group layout");
Check(EventFlagCodec.TryLocate(51000031,out offset,out mask)&&offset==0x6400&&mask==1,"last bit");
Check(EventFlagCodec.TryLocate(51000032,out offset,out mask)&&offset==0x6404&&mask==0x80000000,"next word");
foreach(int invalid in new[]{-1,0,20000000,19990000,80000000})Check(!EventFlagCodec.TryLocate(invalid,out _,out _),"invalid flag");
Check(DsrPositionReader.DecodeMap([0,0,2,10])==1002,"Firelink endian");
Check(DsrPositionReader.DecodeMap([255,255,255,255])==0,"loading map rejected");
Check(DsrPositionReader.DecodeMap([1,0,0,12])==1200,"Darkroot revision");
Check(DsrPositionReader.DecodeArea(101200)==1001,"live Burg area/subarea");
Check(DsrPositionReader.DecodeArea(102000)==1002,"Firelink area");
Check(DsrPositionReader.DecodeArea(121600)==1201,"DLC area");
Check(DsrPositionReader.DecodeArea(0xFFFFFFFF)==0,"invalid area");
var process=Process.GetProcessesByName("DarkSoulsRemastered").FirstOrDefault();
int gameArgument=Array.IndexOf(args,"--game-exe");
if(gameArgument>=0&&gameArgument+1>=args.Length)throw new ArgumentException("--game-exe requires a file path");
var gameExe=gameArgument>=0?args[gameArgument+1]:process?.MainModule?.FileName;
if(gameExe is not null)
{
 var bytes=File.ReadAllBytes(gameExe);
 using var stream=new MemoryStream(bytes);using var pe=new PEReader(stream);
 foreach(var signature in new[]{"48 8B 0D ? ? ? ? 0F 28 F1 48 85 C9 74 ? 48 89 7C","48 8B 0D ? ? ? ? 99 33 C2 45 33 C0 2B C2 8D 50 F6","48 8B 05 ? ? ? ? C6 40 18 00"})
 {
  int rva=DsrPositionReader.FindGlobal(bytes,pe,signature);Check(rva!=0,"unique signature missing");
  Console.WriteLine($"Unique pointer RVA 0x{rva:X}");
 }
 Console.WriteLine("PASS: 3 unique PE signatures.");
}
else Console.WriteLine("PE_CHECK_SKIPPED: supply --game-exe or start the game to check version signatures.");
var flags=JsonSerializer.Deserialize<int[]>(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"web/js/event-flags.json")))!;
Check(flags.All(f=>EventFlagCodec.TryLocate(f,out _,out _)),"unsupported manifest flag");
Console.WriteLine($"PASS: flag bit layout, invalid inputs, area decode, {flags.Length} manifest flags.");
if(process!=null)
{
 var diagnosticsDirectory=Path.Combine(Environment.CurrentDirectory,"artifacts","reader-check");
 Directory.CreateDirectory(diagnosticsDirectory);
 using var reader=new DsrPositionReader();
 Console.WriteLine("Attached="+reader.TryAttach(process,out var message)+" "+message+" "+reader.Capabilities);
 Console.WriteLine("Position="+reader.TryReadPosition(out var position)+" "+JsonSerializer.Serialize(position));
 bool progressOk=reader.TryReadAutoProgress(out var progress);
 Console.WriteLine($"Progress={progressOk}, enabled={progress.EnabledFlags?.Length}, checked={progress.CheckedFlags?.Length}, profile={progress.ProfileId}");
 if(progressOk) File.WriteAllText(Path.Combine(diagnosticsDirectory,"live-reader-snapshot.json"),JsonSerializer.Serialize(new{position,progress}));
 if(args.Contains("--sample-heading"))
 {
  var samples=new List<object>(); var timer=Stopwatch.StartNew();
  Console.WriteLine("Read-only heading sampling for 45 seconds.");
  while(timer.Elapsed.TotalSeconds<45)
  {
   if(reader.TryReadPosition(out var sample))samples.Add(new{t=timer.Elapsed.TotalSeconds,position=sample});
   Thread.Sleep(50);
  }
  File.WriteAllText(Path.Combine(diagnosticsDirectory,"heading-samples.json"),JsonSerializer.Serialize(samples));
  Console.WriteLine($"Saved {samples.Count} heading samples.");
 }
}
else Console.WriteLine("LIVE_CHECK_PENDING: game not running.");
