import time
import os

os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(2)

from pywinauto import Application

app = Application(backend="uia").start(r"C:\Program Files (x86)\Sky Email Extractor\Sky Email Extractor.exe")
time.sleep(4)

main = app.top_window()
print("Window:", main.window_text())
print("The app is open. Do your steps.")
print("Press Ctrl+C here when done.\n")

try:
    while True:
        time.sleep(3)
        dialogs = app.windows()
        for d in dialogs:
            t = d.window_text()
            if t and t != main.window_text():
                print(f"\n>>> MODAL: '{t}'")
                try:
                    for ctrl in d.children():
                        try:
                            info = f"  {ctrl.element_info.control_type} '{ctrl.window_text()}' enabled={ctrl.is_enabled()} visible={ctrl.is_visible()}"
                            print(info)
                        except:
                            pass
                except:
                    pass
                print()

        try:
            grid = main.child_window(title="GridControl", control_type="Table")
            rows = grid.descendants(control_type="Custom")
            print(f"[grid rows: {len(rows)}]", end=" ")
        except:
            print("[grid: n/a]", end=" ")

        try:
            url_input = main.child_window(auto_id="3005", control_type="Edit")
            val = url_input.get_value()
            if val:
                print(f"[url: {val[:60]}]", end=" ")
        except:
            pass

        print()

except KeyboardInterrupt:
    print("\nDone.")
    app.kill()
