@echo off
rem instalar.cmd - instala video-creator en Windows con DOBLE CLIC. Desde una terminal o desde
rem un agente, la linea es la del .ps1 (es la que citan el doctor y los mensajes de arreglo):
rem   powershell -NoProfile -ExecutionPolicy Bypass -File instalar.ps1
rem Lanza instalar.ps1 saltando la politica de ejecucion SOLO en esta ventana: no cambia
rem nada del sistema ni pide administrador. Admite los mismos argumentos que el .ps1:
rem   instalar.cmd -Whisper -SinChrome -SoloSkills
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1" %*
set CODIGO=%ERRORLEVEL%
rem Con doble clic la ventana se cerraria sin dejar leer el resultado: se espera una tecla.
rem No hay forma fiable de distinguir el doble clic de un lanzamiento programatico: Explorer,
rem PowerShell (.\instalar.cmd) y los agentes pasan todos por "cmd /c". Por eso se combinan
rem tres cosas: (1) "/c" en %cmdcmdline% descarta el cmd interactivo, (2) sin argumentos
rem (un doble clic nunca los trae) y (3) "timeout" en vez de "pause": con la entrada
rem redirigida, que es como lanzan los agentes, timeout termina al instante en lugar de
rem quedarse esperando una tecla que nadie va a pulsar; a una persona le espera hasta 5 min.
if "%~1"=="" (
  echo %cmdcmdline% | find /i "/c" >nul && (echo. & timeout /t 300 2>nul)
)
endlocal & exit /b %CODIGO%
