-- ScanSnap Home を最前面に表示するAppleScript
-- スキャンボタンを押す前に実行するか、ショートカットに登録

tell application "System Events"
    -- ScanSnap Home のプロセスを探す
    set scanSnapProcesses to every process whose name contains "ScanSnap"

    repeat with proc in scanSnapProcesses
        set frontmost of proc to true
    end repeat
end tell

-- ScanSnap Home アプリをアクティブにする
tell application "ScanSnap Home"
    activate
end tell
