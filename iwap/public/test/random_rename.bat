@echo off
setlocal enabledelayedexpansion

rem --- 설정 ---
set "prefix=image"  :: 새 파일 이름의 접두사
set "counter=1"     :: 시작 번호
rem ------------

rem 윈도우 임시 폴더에 고유한 이름으로 임시 파일 경로 설정
set "tempFile=%TEMP%\%~n0_%RANDOM%.tmp"

rem 스크립트 자신을 제외한 파일이 있는지 확인
dir /b /a-d | findstr /v /i /c:"%~nx0" > nul
if errorlevel 1 (
    echo 변경할 파일이 없습니다.
    goto :cleanup
)

echo 파일 목록을 생성하고 무작위로 섞는 중입니다...

rem 1. 임시 파일에 "랜덤숫자;파일명" 형태로 저장 (임시 폴더에 생성)
> "%tempFile%" (
    for /f "delims=" %%F in ('dir /b /a-d *.* ^| findstr /v /i /c:"%~nx0"') do (
        set "randomNumber=!RANDOM!"
        echo !randomNumber!;%%F
    )
)

echo 파일 이름 변경을 시작합니다...
echo.

rem 2. 랜덤 숫자를 기준으로 정렬된 임시 파일을 읽어 순서대로 이름 변경
for /f "usebackq tokens=2 delims=;" %%F in (`sort "%tempFile%"`) do (
    rem 3자리 숫자로 만들기 (예: 1 -> 001, 10 -> 010, 100 -> 100)
    set "paddedCounter=00!counter!"
    set "paddedCounter=!paddedCounter:~-3!"

    rem 확장자를 유지하여 이름 변경
    ren "%%F" "!prefix!!paddedCounter!%%~xF"
    echo "%%F"  --^>  "!prefix!!paddedCounter!%%~xF"

    set /a counter+=1
)

echo.
echo 작업이 완료되었습니다.

:cleanup
rem 3. 임시 파일 삭제
if exist "%tempFile%" del "%tempFile%"

pause