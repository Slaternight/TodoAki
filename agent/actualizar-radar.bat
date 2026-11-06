@echo off
REM ============================================================
REM  TodoAki - Actualiza el radar de tendencias
REM  Ejecuta el agente (trends.py) y regenera
REM  frontend/data/radar.json. El registro queda en agent/radar.log
REM
REM  Lo usa la tarea programada "TodoAki - Radar de tendencias",
REM  pero tambien puedes ejecutarlo a mano con doble clic.
REM ============================================================
echo [%date% %time%] Iniciando actualizacion del radar...>> "%~dp0radar.log"
python "%~dp0trends.py" >> "%~dp0radar.log" 2>&1
echo [%date% %time%] Terminado (codigo de salida: %errorlevel%).>> "%~dp0radar.log"
echo.>> "%~dp0radar.log"
