@echo off
REM VS2019 Build Tools C++ ortamini yukle (msvcrt.lib burada), sonra Tauri komutunu calistir
call "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
cd /d "C:\Projects\Chess"
npm run tauri %*
