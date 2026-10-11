@echo off
rem Start the local Hunyuan3D service using the project virtual environment.
rem Using `python server.py` from a plain shell can pick up the system Python,
rem which has no torch installed. This launcher always uses .venv.
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo [ERROR] Virtual environment not found at .venv\. Run:
  echo     python -m venv .venv
  echo     .venv\Scripts\python.exe -m pip install -r requirements.txt
  exit /b 1
)
".venv\Scripts\python.exe" server.py %*
endlocal