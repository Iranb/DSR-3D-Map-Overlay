using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Reflection.PortableExecutable;
using System.Text.Json;

namespace DSRMapOverlay;

// ReadProcessMemory only. SoulSplitter signatures; Soulstruct DS1R flag layout.
internal sealed class DsrPositionReader : IDisposable
{
    private IntPtr handle;
    private long worldGlobal, flagGlobal, gameGlobal;
    private int processId;
    private readonly int[] trackedFlags;
    private static readonly HashSet<int> MapCodes = [1000,1001,1002,1100,1200,1201,1300,1301,1302,1400,1401,1500,1501,1600,1700,1800,1801];
    public DsrPositionReader(bool english = false)
    {
        var path = Path.Combine(AppContext.BaseDirectory,"web","js","event-flags.json");
        trackedFlags = File.Exists(path) ? JsonSerializer.Deserialize<int[]>(File.ReadAllText(path)) ?? [] : [];
    }
    public bool IsAttached => handle != IntPtr.Zero;
    public int AttachedProcessId => processId;
    public int ModuleSize { get; private set; }
    public string VersionName => "重制版 · 只读定位／事件标志";
    public string Capabilities => $"world=0x{worldGlobal:X}, flags=0x{flagGlobal:X}, area=PlayerIns+0x358, tracked={trackedFlags.Length}";
    internal static int FindGlobal(byte[] bytes, PEReader pe, string signature)
    {
        byte?[] pattern=signature.Split(' ').Select(s=>s=="?"?(byte?)null:Convert.ToByte(s,16)).ToArray();
        var matches=new HashSet<int>();
        foreach(var section in pe.PEHeaders.SectionHeaders)
        {
            if ((section.SectionCharacteristics & SectionCharacteristics.MemExecute)==0) continue;
            int end=Math.Min(bytes.Length,section.PointerToRawData+section.SizeOfRawData);
            for(int i=section.PointerToRawData;i+pattern.Length<=end;i++)
            {
                bool match=true;
                for(int j=0;j<pattern.Length;j++) if(pattern[j].HasValue&&pattern[j]!=bytes[i+j]){match=false;break;}
                if(match) matches.Add(section.VirtualAddress+i-section.PointerToRawData+7+BitConverter.ToInt32(bytes,i+3));
            }
        }
        return matches.Count==1?matches.Single():0;
    }
    public bool TryAttach(Process process,out string message)
    {
        message=VersionName;
        if(IsAttached&&process.Id==processId)return true;
        Detach();
        try
        {
            var module=process.MainModule!;var bytes=File.ReadAllBytes(module.FileName);
            using var stream=new MemoryStream(bytes);using var pe=new PEReader(stream);
            int world=FindGlobal(bytes,pe,"48 8B 0D ? ? ? ? 0F 28 F1 48 85 C9 74 ? 48 89 7C");
            int flags=FindGlobal(bytes,pe,"48 8B 0D ? ? ? ? 99 33 C2 45 33 C0 2B C2 8D 50 F6");
            int game=FindGlobal(bytes,pe,"48 8B 05 ? ? ? ? C6 40 18 00");
            if(world==0){message="未识别此游戏版本；手动地图仍可使用";return false;}
            handle=OpenProcess(0x0410,false,process.Id);
            if(handle==IntPtr.Zero){message="无法只读连接游戏";return false;}
            long b=module.BaseAddress.ToInt64();worldGlobal=b+world;
            flagGlobal=flags==0?0:b+flags;gameGlobal=game==0?0:b+game;
            processId=process.Id;ModuleSize=module.ModuleMemorySize;
            message=VersionName+(flags==0?" · 事件指针不可用":"");
            return true;
        }
        catch(Exception e){Detach();message="定位连接失败："+e.Message;return false;}
    }
    private bool Read(long address,byte[] data)=>address>65536&&handle!=IntPtr.Zero&&ReadProcessMemory(handle,new IntPtr(address),data,(nuint)data.Length,out var n)&&n==(nuint)data.Length;
    private long Pointer(long address){byte[] b=new byte[8];return Read(address,b)?BitConverter.ToInt64(b):0;}
    internal static uint DecodeMap(byte[] b)
    {
        int map=b[3]*100+b[2];
        return b[0]<=1&&b[1]<=1&&MapCodes.Contains(map)?(uint)map:0;
    }
    public bool TryReadPosition(out PlayerPosition position)
    {
        return ReadPositionCore(out position);
    }
    internal static uint DecodeArea(uint areaId)
    {
        // DSR-Gadget-Local-Loader PlayerIns.AreaID: area/block/subarea in decimal.
        if(areaId<100000||areaId>181999)return 0;
        int code=(int)(areaId/10000*100+areaId/1000%10);
        return MapCodes.Contains(code)?(uint)code:0;
    }
    private bool ReadPositionCore(out PlayerPosition position)
    {
        position=default;if(!IsAttached)return false;
        long world=Pointer(worldGlobal);if(world==0)return false;
        long player=Pointer(world+0x68);if(player==0)return false;
        long ctrl=Pointer(player+0x68);if(ctrl==0)return false;
        long transform=Pointer(ctrl+0x28);if(transform==0)return false;
        byte[] b=new byte[12];if(!Read(transform+0x10,b))return false;
        float x=BitConverter.ToSingle(b,0),y=BitConverter.ToSingle(b,4),z=BitConverter.ToSingle(b,8);
        if(!float.IsFinite(x)||!float.IsFinite(y)||!float.IsFinite(z)||Math.Abs(x)>100000||Math.Abs(y)>100000||Math.Abs(z)>100000)return false;
        if(x==0&&y==0&&z==0)return false;
        uint map=0;byte[] mapBytes=new byte[4];
        if(Read(player+0x358,mapBytes))map=DecodeArea(BitConverter.ToUInt32(mapBytes));
        byte[] angle=new byte[4];float? heading=Read(transform+4,angle)?BitConverter.ToSingle(angle):null;
        if(heading.HasValue&&!float.IsFinite(heading.Value))heading=null;
        position=new(x,y,z,heading,null,map);return true;
    }
    public bool TryReadAutoProgress(out AutoProgressSnapshot progress)
    {
        progress=default;
        if(flagGlobal==0||trackedFlags.Length==0||!TryReadPosition(out var position))return false;
        long manager=Pointer(flagGlobal);if(manager==0)return false;
        long flags=Pointer(manager);if(flags==0)return false;
        long game=Pointer(gameGlobal);byte[] slotBytes=new byte[4];
        if(game==0||!Read(game+0xAA0,slotBytes))return false;
        int slot=BitConverter.ToInt32(slotBytes);if(slot<0||slot>9)return false;
        var words=new Dictionary<int,uint>();var enabled=new List<int>();
        foreach(int id in trackedFlags.Append(909))
        {
            if(!EventFlagCodec.TryLocate(id,out int offset,out uint mask))continue;
            if(!words.TryGetValue(offset,out uint word))
            {
                byte[] b=new byte[4];if(!Read(flags+offset,b))return false;
                words[offset]=word=BitConverter.ToUInt32(b);
            }
            if((word&mask)!=0)enabled.Add(id);
        }
        if(!enabled.Remove(909))return false; // NewGameFlagsInitialized; reject loading garbage.
        if(Pointer(manager)!=flags||!Read(game+0xAA0,slotBytes)||BitConverter.ToInt32(slotBytes)!=slot||
           !TryReadPosition(out var after)||after.MapId!=position.MapId)return false;
        progress=new(enabled.ToArray(),trackedFlags,"slot-"+slot);return true;
    }
    public void Detach(){if(handle!=IntPtr.Zero)CloseHandle(handle);handle=IntPtr.Zero;processId=0;worldGlobal=flagGlobal=gameGlobal=0;}
    public void Dispose()=>Detach();
    [DllImport("kernel32.dll",SetLastError=true)]private static extern IntPtr OpenProcess(uint access,bool inherit,int pid);
    [DllImport("kernel32.dll",SetLastError=true)]private static extern bool ReadProcessMemory(IntPtr h,IntPtr address,[Out]byte[] buffer,nuint size,out nuint read);
    [DllImport("kernel32.dll")]private static extern bool CloseHandle(IntPtr h);
}
internal static class EventFlagCodec
{
    private static readonly Dictionary<int,int> Groups=new(){{0,0},{1,0x500},{5,0x5F00},{6,0xB900},{7,0x11300}};
    private static readonly int[] Areas=[0,100,101,102,110,120,121,130,131,132,140,141,150,151,160,170,180,181];
    public static bool TryLocate(int id,out int offset,out uint mask)
    {
        offset=0;mask=0;if(id<=0||id>79999999)return false;
        int area=Array.IndexOf(Areas,id/10000%1000);
        if(area<0||!Groups.TryGetValue(id/10000000,out var group))return false;
        int number=id%1000;offset=group+area*0x500+(id/1000%10)*128+(number/32)*4;
        mask=0x80000000u>>(number%32);return true;
    }
}
internal readonly record struct PlayerPosition(float X,float Y,float Z,float? Heading,float? CameraHeading,uint MapId);
internal readonly record struct AutoProgressSnapshot(int[] EnabledFlags,int[] CheckedFlags,string ProfileId);
