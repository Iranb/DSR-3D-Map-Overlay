using System.Diagnostics;

namespace DSRMapOverlay;

static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        string? restartLanguage;
        using (var singleInstance = new Mutex(true, @"Local\DSRMapOverlay.SingleInstance", out var isFirstInstance))
        {
            if (!isFirstInstance) return;
            var languageOverride = args
                .FirstOrDefault(argument => argument.StartsWith("--lang=", StringComparison.OrdinalIgnoreCase))?
                .Split('=', 2)[1];
            if (args.Contains("--english", StringComparer.OrdinalIgnoreCase)) languageOverride = "en";

            ApplicationConfiguration.Initialize();
            var form = new Form1(
                args.Contains("--show", StringComparer.OrdinalIgnoreCase),
                languageOverride);
            Application.Run(form);
            restartLanguage = form.RestartLanguage;
        }

        if (restartLanguage is not null && Environment.ProcessPath is { } executablePath)
        {
            var startInfo = new ProcessStartInfo(executablePath) { UseShellExecute = true };
            startInfo.ArgumentList.Add("--show");
            startInfo.ArgumentList.Add("--lang=" + restartLanguage);
            Process.Start(startInfo);
        }
    }
}
