@echo off
chcp 65001 >nul
title Installateur Ebisu
set "EBISU_BAT=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$t = [IO.File]::ReadAllText($env:EBISU_BAT, [Text.Encoding]::UTF8); $m = '#' + '#PS'; iex $t.Substring($t.IndexOf($m) + $m.Length)"
set "EBISU_CODE=%errorlevel%"
echo.
if not defined EBISU_NESTED pause
exit /b %EBISU_CODE%

##PS
# Installs or updates the Ebisu server's pack for the official Minecraft launcher: Fabric, a profile
# "Ebisu" with its own game folder (%APPDATA%\.minecraft-ebisu), and in it exactly the mods of
# pack.json, each checked against its SHA-256. Run again to update: what the pack dropped is taken
# out, what the player added is left alone. Written by tools/serveur/pack.py's sibling in the mod's
# repository; EBISU_PACK_URL and EBISU_MC_ROOT override the pack and the launcher folder for tests.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.IO.Compression.FileSystem

$PackUrl = if ($env:EBISU_PACK_URL) { $env:EBISU_PACK_URL } else { 'https://gamcrosskf.github.io/ebisu/serveur/pack.json' }
$Base = $PackUrl.Substring(0, $PackUrl.Replace('\', '/').LastIndexOf('/') + 1)
$Mc = if ($env:EBISU_MC_ROOT) { $env:EBISU_MC_ROOT } else { Join-Path $env:APPDATA '.minecraft' }
$Game = Join-Path (Split-Path $Mc) '.minecraft-ebisu'
$Utf8 = New-Object Text.UTF8Encoding $false

function Say([string]$text, [string]$color = 'Gray') { Write-Host $text -ForegroundColor $color }

function Fetch([string]$url) {
	if ($url -match '^https?://') { return (New-Object Net.WebClient).DownloadData($url) }
	return [IO.File]::ReadAllBytes($url)
}

function Sha256([byte[]]$bytes) {
	$sha = [Security.Cryptography.SHA256]::Create()
	return ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join ''
}

function ModId([string]$jar) {
	try {
		$zip = [IO.Compression.ZipFile]::OpenRead($jar)
		try {
			$entry = $zip.GetEntry('fabric.mod.json')
			if (-not $entry) { return $null }
			$reader = New-Object IO.StreamReader($entry.Open(), [Text.Encoding]::UTF8)
			$text = $reader.ReadToEnd(); $reader.Close()
			if ($text -match '"id"\s*:\s*"([^"]+)"') { return $Matches[1] }
		} finally { $zip.Dispose() }
	} catch { }
	return $null
}

function Fail([string]$text) { Say ''; Say $text 'Red'; exit 1 }

Say ''
Say '  ★ EBISU ★  installateur du serveur' 'Yellow'
Say ''

# The official launcher, run at least once, and closed: it rewrites its profiles when it quits.
$profilesFiles = @('launcher_profiles.json', 'launcher_profiles_microsoft_store.json') |
	ForEach-Object { Join-Path $Mc $_ } | Where-Object { Test-Path $_ }
if (-not $profilesFiles) {
	Fail "Le launcher officiel de Minecraft n'est pas trouvé dans $Mc. Lance-le une fois, connecte-toi, ferme-le, puis relance cet installateur."
}
while (-not $env:EBISU_MC_ROOT -and (Get-Process -Name 'MinecraftLauncher', 'Minecraft' -ErrorAction SilentlyContinue)) {
	Say 'Le launcher Minecraft est ouvert : ferme-le complètement, puis appuie sur Entrée.' 'Yellow'
	if ($null -eq [Console]::ReadLine()) { Fail 'Ferme le launcher Minecraft, puis relance cet installateur.' }
}

Say "Lecture du pack…"
try { $pack = [Text.Encoding]::UTF8.GetString((Fetch $PackUrl)) | ConvertFrom-Json }
catch { Fail "Impossible de lire le pack ($PackUrl) : vérifie ta connexion internet. $($_.Exception.Message)" }

# A pack written for a newer installer than this copy: the newest one is fetched and run in its place,
# from a temporary folder (cmd reads a running .bat as it goes, it cannot be overwritten), once.
$InstallerVersion = 2
if ($pack.installer -and [int]$pack.installer -gt $InstallerVersion -and -not $env:EBISU_NESTED) {
	Say "Mise à jour de l'installateur…" 'Yellow'
	$fresh = Join-Path $env:TEMP 'Installer-Ebisu.bat'
	try { [IO.File]::WriteAllBytes($fresh, (Fetch ($Base + 'Installer-Ebisu.bat'))) }
	catch { Fail "Impossible de télécharger le nouvel installateur : retélécharge Installer-Ebisu.bat. $($_.Exception.Message)" }
	$env:EBISU_NESTED = '1'
	& cmd.exe /c "`"$fresh`""
	exit $LASTEXITCODE
}

# Each file of the pack goes in mods\ or, for a shader pack, in shaderpacks\.
function Folder($entry) { if ($entry.folder) { return $entry.folder } return 'mods' }
$entries = @($pack.mods)
$shaderCount = @($entries | Where-Object { (Folder $_) -eq 'shaderpacks' }).Count
Say ("Minecraft {0} · Fabric {1} · Ebisu {2} · {3} mods · {4} shaders" -f $pack.minecraft, $pack.loader, $pack.ebisu, ($entries.Count - $shaderCount), $shaderCount) 'White'

# Fabric: the version the launcher starts, inheriting from vanilla, which it downloads itself.
$vid = "fabric-loader-$($pack.loader)-$($pack.minecraft)"
$vdir = Join-Path $Mc "versions\$vid"
if (-not (Test-Path (Join-Path $vdir "$vid.json"))) {
	Say "Installation de Fabric $($pack.loader)…"
	New-Item -ItemType Directory -Force $vdir | Out-Null
	try { $json = Fetch "https://meta.fabricmc.net/v2/versions/loader/$($pack.minecraft)/$($pack.loader)/profile/json" }
	catch { Fail "Impossible de télécharger Fabric : $($_.Exception.Message)" }
	[IO.File]::WriteAllBytes((Join-Path $vdir "$vid.json"), $json)
	[IO.File]::WriteAllBytes((Join-Path $vdir "$vid.jar"), [byte[]]@())
}
Say "Fabric $($pack.loader) : prêt." 'Green'

# The pack's own game folder; the player's settings come along the first time.
$mods = Join-Path $Game 'mods'
New-Item -ItemType Directory -Force $mods | Out-Null
if (-not (Test-Path (Join-Path $Game 'options.txt')) -and (Test-Path (Join-Path $Mc 'options.txt'))) {
	Copy-Item (Join-Path $Mc 'options.txt') (Join-Path $Game 'options.txt')
}

# What the installer put there last time, as folder/file (a bare name is from before shader packs: mods).
$stateFile = Join-Path $mods '.ebisu-pack.txt'
$before = if (Test-Path $stateFile) { @(Get-Content $stateFile -Encoding UTF8 | ForEach-Object { if ($_ -like '*/*') { $_ } else { "mods/$_" } }) } else { @() }
$wanted = @($entries | ForEach-Object { "$(Folder $_)/$($_.file)" })
$ids = @($entries | Where-Object { (Folder $_) -eq 'mods' } | ForEach-Object { $_.id })
$aside = Join-Path $Game 'mods-mis-de-cote'

foreach ($mod in $entries) {
	$dir = Join-Path $Game (Folder $mod)
	New-Item -ItemType Directory -Force $dir | Out-Null
	$dest = Join-Path $dir $mod.file
	if ((Test-Path $dest) -and ((Sha256 ([IO.File]::ReadAllBytes($dest))) -eq $mod.sha256)) {
		Say ("  ✔ {0} {1}" -f $mod.name, $mod.version) 'DarkGreen'
		continue
	}
	Say ("  ↓ {0} {1} ({2:N1} Mo)…" -f $mod.name, $mod.version, ($mod.size / 1MB))
	try { $bytes = Fetch $mod.url } catch { Fail "Téléchargement impossible : $($mod.url). $($_.Exception.Message)" }
	if ((Sha256 $bytes) -ne $mod.sha256) { Fail "$($mod.file) ne correspond pas à son empreinte SHA-256 : fichier corrompu ou modifié, rien n'est installé." }
	[IO.File]::WriteAllBytes($dest, $bytes)
	Say ("  ✔ {0} {1}" -f $mod.name, $mod.version) 'Green'
}

# What the pack no longer has, and any other copy of one of its mods (an old Ebisu put there by
# hand would load twice): moved aside, never deleted. The player's own mods and shader packs stay,
# and so do the copies /ebisushaders makes of a pack for the Astrelume.
foreach ($folder in @('mods', 'shaderpacks')) {
	$dir = Join-Path $Game $folder
	if (-not (Test-Path $dir)) { continue }
	foreach ($file in Get-ChildItem $dir -File) {
		$key = "$folder/$($file.Name)"
		if ($wanted -contains $key) { continue }
		$copy = ($folder -eq 'mods') -and ($file.Extension -eq '.jar') -and ($ids -contains (ModId $file.FullName))
		if (($before -contains $key) -or $copy) {
			$to = if ($folder -eq 'mods') { $aside } else { Join-Path $aside $folder }
			New-Item -ItemType Directory -Force $to | Out-Null
			Move-Item $file.FullName (Join-Path $to $file.Name) -Force
			Say ("  ✘ {0} mis de côté (ancienne version)" -f $file.Name) 'DarkYellow'
		}
	}
}
[IO.File]::WriteAllLines($stateFile, [string[]]$wanted, $Utf8)

# The launcher profile: Fabric, the pack's folder, the server's picture, enough memory.
$icon = $null
try { $icon = 'data:image/png;base64,' + [Convert]::ToBase64String((Fetch ($Base + 'icon.png'))) } catch { }
$now = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$javaArgs = "-Xmx$($pack.memory) -XX:+UnlockExperimentalVMOptions -XX:+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M"
foreach ($file in $profilesFiles) {
	$backup = "$file.avant-ebisu"
	if (-not (Test-Path $backup)) { Copy-Item $file $backup }
	$launcher = [IO.File]::ReadAllText($file, [Text.Encoding]::UTF8) | ConvertFrom-Json
	if (-not $launcher.profiles) { $launcher | Add-Member -NotePropertyName profiles -NotePropertyValue ([pscustomobject]@{}) -Force }
	$old = $launcher.profiles.ebisu
	$entry = [ordered]@{
		name = $pack.name; type = 'custom'; created = $(if ($old -and $old.created) { $old.created } else { $now }); lastUsed = $now
		lastVersionId = $vid; gameDir = $Game; javaArgs = $javaArgs
	}
	if ($icon) { $entry.icon = $icon }
	$launcher.profiles | Add-Member -NotePropertyName ebisu -NotePropertyValue ([pscustomobject]$entry) -Force
	[IO.File]::WriteAllText($file, ($launcher | ConvertTo-Json -Depth 64), $Utf8)
}
Say "Profil « $($pack.name) » : prêt dans le launcher." 'Green'

# The server in the multiplayer list, the first time: servers.dat is a small NBT file.
$serversDat = Join-Path $Game 'servers.dat'
if ($pack.server -and $pack.server.address -and -not (Test-Path $serversDat)) {
	$ms = New-Object IO.MemoryStream
	function Str([string]$s) { $b = [Text.Encoding]::UTF8.GetBytes($s); $ms.WriteByte(($b.Length -shr 8) -band 255); $ms.WriteByte($b.Length -band 255); $ms.Write($b, 0, $b.Length) }
	function Field([string]$name, [string]$value) { $ms.WriteByte(8); Str $name; Str $value }
	$ms.WriteByte(10); Str ''
	$ms.WriteByte(9); Str 'servers'; $ms.WriteByte(10); $ms.Write([byte[]](0, 0, 0, 1), 0, 4)
	Field 'name' $pack.server.name
	Field 'ip' $pack.server.address
	if ($icon) { Field 'icon' $icon.Substring($icon.IndexOf(',') + 1) }
	$ms.WriteByte(0)
	$ms.WriteByte(0)
	[IO.File]::WriteAllBytes($serversDat, $ms.ToArray())
	Say "Serveur « $($pack.server.name) » ajouté à la liste multijoueur." 'Green'
}

Say ''
Say 'Terminé ! Ouvre le launcher, choisis le profil « Ebisu » à côté du bouton Jouer, puis Jouer.' 'Yellow'
Say "Pour mettre à jour plus tard : relance simplement cet installateur." 'Gray'
