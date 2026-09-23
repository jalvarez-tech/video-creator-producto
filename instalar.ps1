#Requires -Version 5.1
<#
  instalar.ps1 - instala video-creator en Windows 10/11 x64 SIN administrador (sin UAC).

    powershell -NoProfile -ExecutionPolicy Bypass -File instalar.ps1 [-Whisper] [-SinChrome] [-SoloSkills]
    (o doble clic en instalar.cmd, que hace exactamente eso y deja la ventana abierta al acabar)

  Hace solo dos cosas y delega el resto:
    1. Se asegura de que hay un Node 22 o superior. Si no lo hay: winget (OpenJS.NodeJS.LTS,
       ambito usuario) y, si winget no esta o falla, el zip portable oficial de nodejs.org
       verificado con su SHASUMS256.txt, en %LOCALAPPDATA%\video-creator\node.
    2. Anade al PATH del usuario (registro HKCU\Environment) la carpeta de herramientas
       %LOCALAPPDATA%\video-creator\bin y ejecuta "node herramientas\setup.mjs", que instala
       todo lo demas (ffmpeg, uv, auto-editor, dependencias, skills) y pasa el doctor.
    Al final comprueba que node en una terminal NUEVA (PATH de maquina + usuario) sea el bueno:
    un Node viejo instalado con el MSI en Program Files va en el PATH de maquina y gana siempre.

  Se puede ejecutar tantas veces como haga falta: nada se instala dos veces.

  Este archivo esta en ASCII puro a proposito: Windows PowerShell 5.1 lee un .ps1 UTF-8 sin BOM
  como ANSI y estropea los acentos, y bajo "irm ... | iex" un BOM rompe la primera linea. Por eso
  los mensajes van sin tildes y sin emojis. Dentro de las funciones nunca se usa "exit" (cerraria
  la consola del usuario si el script llega por iex): se usa return/throw.

  Nota para quien lo edite: en PowerShell TODO lo que una funcion emite sin capturar forma parte
  de lo que devuelve. Cualquier cmdlet o programa que escriba en el pipeline va con "| Out-Null"
  o "| Out-Host", y los mensajes van por Write-Host; si no, "$codigo = Invoke-Instalacion"
  recibe un array y "exit $codigo" revienta.
#>
[CmdletBinding()]
param(
  [switch]$SoloSkills,
  [switch]$Whisper,
  [switch]$SinWhisper,
  [switch]$SinChrome,
  [switch]$SinDoctor
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'           # la barra de progreso de 5.1 multiplica por 10 el tiempo de descarga
$PSNativeCommandUseErrorActionPreference = $false  # PowerShell 7: que un codigo de salida distinto de 0 no sea excepcion
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch { }

# Version fija de Node para el zip portable. Al cambiarla, cambia los dos sha256
# (estan en https://nodejs.org/dist/vX.Y.Z/SHASUMS256.txt).
$NODE_VERSION = '24.21.0'
$NODE_SHA256 = @{
  'x64'   = '158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541'
  'arm64' = '8779b1bde1d39f8d420e3b57aa657b39891af434d3de44a919044cec06785921'
}
$NODE_MAYOR_MINIMO = 22
$DIR_APP = Join-Path $env:LOCALAPPDATA 'video-creator'
$DIR_BIN = Join-Path $DIR_APP 'bin'     # la misma carpeta que dirBinUsuario() en herramientas/comun.mjs
$DIR_NODE = Join-Path $DIR_APP 'node'   # solo si hace falta el zip portable
$LINEA_INSTALAR = 'powershell -NoProfile -ExecutionPolicy Bypass -File instalar.ps1'  # lo que se repite en los mensajes (instalar.cmd es solo para el doble clic)

function Write-Ok([string]$m)    { Write-Host "[OK]    $m" -ForegroundColor Green }
function Write-Info([string]$m)  { Write-Host "  -     $m" }
function Write-Aviso([string]$m) { Write-Host "[AVISO] $m" -ForegroundColor Yellow }
function Write-Fallo([string]$m) { Write-Host "[ERROR] $m" -ForegroundColor Red }

function Get-Raiz {
  # Con -File es la carpeta del script. Bajo "irm | iex" no hay script: vale la carpeta actual si es el repo.
  $candidatos = @()
  if ($PSScriptRoot) { $candidatos += $PSScriptRoot }
  $candidatos += (Get-Location).Path
  foreach ($c in $candidatos) {
    if (Test-Path -LiteralPath (Join-Path $c 'herramientas\setup.mjs')) { return (Resolve-Path -LiteralPath $c).Path }
  }
  throw 'no encuentro herramientas\setup.mjs: ejecuta este script desde la carpeta del repo (o haz doble clic en instalar.cmd dentro de ella)'
}

function Get-Arquitectura {
  $a = $env:PROCESSOR_ARCHITEW6432
  if (-not $a) { $a = $env:PROCESSOR_ARCHITECTURE }
  if (-not $a) { return 'x64' }
  if ($a -match 'ARM64') { return 'arm64' }
  if ($a -match 'AMD64') { return 'x64' }
  return $a.ToLower()
}

function Invoke-Nativo {
  # Ejecuta un programa externo y devuelve SOLO su codigo de salida, como [int].
  # La salida del programa va a la consola con Out-Host (o se tira con -Silencio): si se dejara
  # en el pipeline, la funcion devolveria @(lineas..., codigo) y quien la llama recibiria un array.
  # En 5.1, con ErrorActionPreference=Stop, cualquier texto por stderr se convierte en excepcion:
  # aqui se baja a Continue mientras corre.
  param([string]$Exe, [string[]]$Argumentos = @(), [switch]$Silencio)
  $viejo = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    if ($Silencio) { & $Exe @Argumentos 2>&1 | Out-Null } else { & $Exe @Argumentos | Out-Host }
    return [int]$LASTEXITCODE
  } catch {
    return 1
  } finally {
    $ErrorActionPreference = $viejo
  }
}

function Get-MayorDeNode([string]$Exe) {
  # Version mayor de UN node.exe concreto, o 0 si no arranca.
  $viejo = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    # Con "--version" y no con "-p <js>": PowerShell 5.1 pasa las comillas dobles de un
    # argumento sin escapar, el runtime de C de node.exe las quita y el JS llega roto
    # (SyntaxError, codigo 1): en un Windows real, esta funcion devolvia 0 con un
    # Node 24 recien instalado y el instalador daba por perdido lo que acababa de poner.
    $v = & $Exe --version 2>$null
    if ($LASTEXITCODE -eq 0 -and "$v" -match '^v(\d+)\.') { return [int]$Matches[1] }
    return 0
  } catch {
    return 0
  } finally {
    $ErrorActionPreference = $viejo
  }
}

function Get-NodeMayor {
  # Version mayor del node que hay en el PATH de ESTA sesion, o 0 si no hay ninguno o no arranca.
  $node = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $node) { return 0 }
  return (Get-MayorDeNode $node.Source)
}

function Get-NodeDeTerminalesNuevas {
  # El node.exe que ganara en una terminal NUEVA: Windows compone su PATH como Machine;User,
  # en ese orden, y no como el PATH de esta sesion (donde el instalador puso el suyo delante).
  $maquina = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $usuario = [Environment]::GetEnvironmentVariable('Path', 'User')
  foreach ($dir in ("$maquina;$usuario" -split ';')) {
    $d = $dir.Trim().Trim('"')
    if (-not $d) { continue }
    try {
      $exe = Join-Path $d 'node.exe'
      if (Test-Path -LiteralPath $exe -PathType Leaf -ErrorAction SilentlyContinue) { return $exe }
    } catch { }
  }
  return $null
}

function Update-PathDeSesion {
  # Lo que winget o un instalador escriben en el registro no entra en esta sesion: se recarga a mano.
  # Aqui SI se quiere el valor expandido (es lo que vera cualquier proceso).
  $maquina = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $usuario = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$maquina;$usuario"
}

function Send-CambioDeEntorno {
  # Al escribir HKCU\Environment por el registro nadie avisa a las ventanas abiertas (Explorer, y
  # con el las terminales que se abran desde el menu Inicio): hay que emitir WM_SETTINGCHANGE a
  # mano, cosa que SetEnvironmentVariable hacia sola. Si falla no pasa nada grave: la siguiente
  # sesion de Windows lo lee del registro igual.
  try {
    if (-not ('VideoCreator.Entorno' -as [type])) {
      Add-Type -Namespace VideoCreator -Name Entorno -MemberDefinition @'
[DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
'@
    }
    $resultado = [UIntPtr]::Zero
    # HWND_BROADCAST = 0xffff, WM_SETTINGCHANGE = 0x1A, SMTO_ABORTIFHUNG = 2, 5 s de plazo.
    [VideoCreator.Entorno]::SendMessageTimeout([IntPtr]0xffff, 0x1A, [UIntPtr]::Zero, 'Environment', 2, 5000, [ref]$resultado) | Out-Null
  } catch { }
}

function Add-PathDeUsuario([string]$Dir) {
  # Anade $Dir al PATH del usuario (HKCU\Environment) si no esta, delante, y tambien a esta sesion.
  # Se lee y se escribe por el REGISTRO y no con [Environment]::SetEnvironmentVariable: ese expande
  # las entradas %VAR% al leer y graba el resultado como REG_SZ, con lo que %USERPROFILE%\... del
  # usuario quedaria fijado y expandido para siempre. Aqui se lee sin expandir y se escribe como
  # REG_EXPAND_SZ, que es el tipo con el que Windows crea ese valor.
  $limpio = $Dir.TrimEnd('\')
  $clave = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)
  if (-not $clave) { $clave = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Environment') }
  try {
    $actual = [string]$clave.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
    # Para saber si ya esta se compara EXPANDIDO (una entrada %LOCALAPPDATA%\... cuenta igual).
    $partes = @($actual -split ';' | Where-Object { $_ -ne '' } | ForEach-Object { [Environment]::ExpandEnvironmentVariables($_).TrimEnd('\') })
    if ($partes -notcontains $limpio) {
      $nuevo = if ($actual) { "$Dir;$actual" } else { $Dir }
      $clave.SetValue('Path', $nuevo, [Microsoft.Win32.RegistryValueKind]::ExpandString)
      Send-CambioDeEntorno
      Write-Ok "anadido al PATH del usuario: $Dir (las terminales nuevas ya lo veran)"
    }
  } finally {
    $clave.Close()
  }
  $sesion = @($env:Path -split ';' | ForEach-Object { $_.TrimEnd('\') })
  if ($sesion -notcontains $limpio) { $env:Path = "$Dir;$env:Path" }
}

function Test-CodigoWingetOk([int64]$Codigo) {
  # 0 = instalado; 0x8A15002B = ya instalado y sin actualizacion; 0x8A150061 = ya instalado.
  if ($Codigo -eq 0) { return $true }
  # OJO: 0xFFFFFFFF en PowerShell es el [int] -1; la mascara de 32 bits tiene que ser un entero largo.
  $hex = '{0:X8}' -f ($Codigo -band 4294967295)
  return ($hex -eq '8A15002B' -or $hex -eq '8A150061')
}

function Install-NodeConWinget {
  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if (-not $winget) {
    Write-Info 'winget no esta en este equipo: paso al zip portable de nodejs.org'
    return $false
  }
  Write-Info 'instalando Node LTS con winget (ambito usuario, sin preguntas)...'
  $codigo = Invoke-Nativo $winget.Source @('install', '-e', '--source', 'winget', '--scope', 'user', '--silent', '--disable-interactivity', '--accept-package-agreements', '--accept-source-agreements', 'OpenJS.NodeJS.LTS')
  if (-not (Test-CodigoWingetOk $codigo)) {
    $hex = '0x{0:X8}' -f ([int64]$codigo -band 4294967295)
    Write-Aviso "winget no pudo instalar Node (codigo $hex); paso al zip portable de nodejs.org, que no necesita permisos"
    return $false
  }
  Update-PathDeSesion
  return ((Get-NodeMayor) -ge $NODE_MAYOR_MINIMO)
}

function Get-HashEsperado([string]$Shasums, [string]$Archivo) {
  # Busca en el texto de SHASUMS256.txt la linea "hex  archivo" y devuelve el hex en minusculas.
  foreach ($linea in ($Shasums -split "`n")) {
    $l = $linea.Trim()
    if ($l -match ('^([0-9a-fA-F]{64})\s+' + [regex]::Escape($Archivo) + '$')) { return $Matches[1].ToLower() }
  }
  return $null
}

function Install-NodePortable([string]$Arch) {
  if (-not $NODE_SHA256.ContainsKey($Arch)) { throw "no hay zip portable de Node para la arquitectura $Arch" }
  $archivo = "node-v$NODE_VERSION-win-$Arch.zip"
  $url = "https://nodejs.org/dist/v$NODE_VERSION/$archivo"
  $tmp = Join-Path ([IO.Path]::GetTempPath()) ('video-creator-node-' + [IO.Path]::GetRandomFileName())
  New-Item -ItemType Directory -Path $tmp -Force | Out-Null
  try {
    $zip = Join-Path $tmp $archivo
    Write-Info "descargando Node $NODE_VERSION portable ($archivo, unos 50 MB)..."
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $zip
    # Checksum: el que publica nodejs.org y, por si alguien lo cambiara por el camino, el fijado aqui.
    $esperado = $NODE_SHA256[$Arch]
    try {
      $shasums = (Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt").Content
      $publicado = Get-HashEsperado $shasums $archivo
      if ($publicado -and $publicado -ne $esperado) { throw "SHASUMS256.txt de nodejs.org da $publicado y este script esperaba $esperado" }
    } catch {
      Write-Aviso "no pude contrastar SHASUMS256.txt de nodejs.org ($($_.Exception.Message)); uso el sha256 fijado en el script"
    }
    $real = (Get-FileHash -Algorithm SHA256 -LiteralPath $zip).Hash.ToLower()
    if ($real -ne $esperado) { throw "el zip de Node no coincide con su sha256 ($real distinto de $esperado): no lo instalo" }
    Write-Info 'descomprimiendo...'
    Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
    $carpeta = Join-Path $tmp "node-v$NODE_VERSION-win-$Arch"
    if (-not (Test-Path -LiteralPath (Join-Path $carpeta 'node.exe'))) { throw 'el zip de Node no trae node.exe donde se esperaba' }
    New-Item -ItemType Directory -Path $DIR_APP -Force | Out-Null
    if (Test-Path -LiteralPath $DIR_NODE) { Remove-Item -LiteralPath $DIR_NODE -Recurse -Force }
    Move-Item -LiteralPath $carpeta -Destination $DIR_NODE
  } finally {
    Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
  }
  Add-PathDeUsuario $DIR_NODE
  Write-Ok "Node $NODE_VERSION instalado en $DIR_NODE (portable, sin administrador)"
}

function Invoke-Instalacion {
  $raiz = Get-Raiz
  $arch = Get-Arquitectura
  Write-Host "video-creator - instalacion en $raiz (Windows $arch, PowerShell $($PSVersionTable.PSVersion))"
  if ($arch -eq 'arm64') {
    Write-Aviso 'Windows ARM64: Remotion (el motor de video) no funciona en esta arquitectura. Instalo el resto igual, pero los renders fallaran; usa un PC x64 o un Mac.'
  }

  # 1. Node >= 22
  $mayor = Get-NodeMayor
  if ($mayor -ge $NODE_MAYOR_MINIMO) {
    $version = & node.exe --version
    Write-Ok "Node $version ya esta ($((Get-Command node.exe).Source))"
  } else {
    if ($mayor -gt 0) { Write-Info "hay un Node $mayor pero se necesita $NODE_MAYOR_MINIMO o superior" } else { Write-Info 'no hay Node en este equipo' }
    $listo = Install-NodeConWinget
    if (-not $listo) {
      Install-NodePortable $arch
      $listo = ((Get-NodeMayor) -ge $NODE_MAYOR_MINIMO)
    }
    if (-not $listo) { throw "instale Node pero esta sesion no lo ve: cierra esta ventana, abre otra y repite: $LINEA_INSTALAR" }
    $version = & node.exe --version
    Write-Ok "Node $version listo"
  }
  $nodeBueno = (Get-Command node.exe).Source

  # 2. PATH del usuario con la carpeta de herramientas (ffmpeg, uv, auto-editor...)
  New-Item -ItemType Directory -Path $DIR_BIN -Force | Out-Null
  Add-PathDeUsuario $DIR_BIN

  # 3. Todo lo demas lo hace setup.mjs, que termina con el doctor
  $argumentos = @()
  if ($SoloSkills) { $argumentos += '--solo-skills' }
  if ($Whisper)    { $argumentos += '--whisper' }
  if ($SinWhisper) { $argumentos += '--sin-whisper' }
  if ($SinChrome)  { $argumentos += '--sin-chrome' }
  if ($SinDoctor)  { $argumentos += '--sin-doctor' }
  # El fetch() de Node ignora HTTPS_PROXY salvo con esto (Node >= 24.5); un Node anterior no lo
  # entiende y no pasa nada. Asi el setup atraviesa el mismo proxy que npm.
  $env:NODE_USE_ENV_PROXY = '1'
  Write-Info ('ejecutando node herramientas\setup.mjs ' + ($argumentos -join ' '))
  Write-Host ''
  Push-Location -LiteralPath $raiz
  try {
    $codigo = Invoke-Nativo 'node.exe' (@((Join-Path $raiz 'herramientas\setup.mjs')) + $argumentos)
  } finally {
    Pop-Location
  }
  Write-Host ''

  # 4. El node que ganara en las terminales NUEVAS. Un Node viejo instalado con el MSI oficial
  #    vive en C:\Program Files\nodejs, que va en el PATH de MAQUINA, y Windows pone el de maquina
  #    antes que el del usuario: el portable de este instalador solo gana dentro de esta sesion.
  #    Sin este aviso el usuario entraria en un bucle doctor [ERROR] -> instalar -> doctor [ERROR].
  $futuro = Get-NodeDeTerminalesNuevas
  if ($futuro -and ($futuro.TrimEnd('\') -ne $nodeBueno.TrimEnd('\'))) {
    $mayorFuturo = Get-MayorDeNode $futuro
    if ($mayorFuturo -lt $NODE_MAYOR_MINIMO) {
      Write-Aviso "en las terminales nuevas seguira mandando $futuro (Node $mayorFuturo), que es anterior a $NODE_MAYOR_MINIMO, porque va en el PATH de maquina y ese siempre gana al del usuario."
      Write-Aviso "  Arreglalo de una de estas formas: actualiza ese Node con el instalador de https://nodejs.org (pide administrador una vez), o desinstalalo en Configuracion > Aplicaciones."
      Write-Aviso "  Mientras tanto, lanza los comandos con la ruta completa del Node bueno: `"$nodeBueno`" herramientas\doctor.mjs (y lo mismo con setup.mjs y los demas)."
      if ($codigo -eq 0) { $codigo = 2 }
    }
  }

  if ($codigo -ne 0) {
    Write-Fallo "la instalacion termino con avisos (codigo $codigo): mira las lineas marcadas arriba, corrige lo que dicen y repite: $LINEA_INSTALAR"
  } else {
    Write-Info 'abre una terminal NUEVA para que node, ffmpeg y uv esten disponibles tambien fuera de este script'
  }
  return $codigo
}

$codigoFinal = 0
try {
  $codigoFinal = Invoke-Instalacion
} catch {
  Write-Fallo $_.Exception.Message
  $codigoFinal = 1
}
# Solo cuando el script corre como archivo (-File / instalar.cmd) se sale con codigo;
# bajo "irm | iex" un exit cerraria la consola del usuario.
if ($PSCommandPath) { exit $codigoFinal }
