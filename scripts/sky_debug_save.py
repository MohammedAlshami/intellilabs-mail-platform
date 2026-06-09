import time, os
os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(2)
from pywinauto import Application, keyboard
app = Application(backend="uia").start(r"C:\Program Files (x86)\Sky Email Extractor\Sky Email Extractor.exe")
time.sleep(5)
m = app.top_window()
m.set_focus()
time.sleep(1)

m.child_window(title="Web Search", control_type="TabItem").click_input()
time.sleep(1)
m.child_window(auto_id="3005", control_type="Edit").click_input()
time.sleep(0.3)
keyboard.send_keys("^a{DELETE}")
time.sleep(0.3)
keyboard.send_keys("ijo-bs.com")
time.sleep(0.5)
m.child_window(auto_id="3001", control_type="Button").click_input()
time.sleep(3)
try:
    m.child_window(title="Ok", control_type="Button").click_input()
    time.sleep(2)
except:
    pass

for i in range(30):
    time.sleep(2)
    try:
        if m.child_window(auto_id="3001", control_type="Button").is_enabled():
            print(f"Search done ({i*2+2}s)")
            break
    except:
        pass
time.sleep(2)

# Dismiss trial
try:
    k = m.child_window(title="Keep on trial version", control_type="Button")
    if k.exists() and k.is_visible():
        k.click_input()
        print("Dismissed trial")
        time.sleep(2)
except:
    pass

# Click Export to csv
m.child_window(title="Export to csv", control_type="Button").click_input()
print("Export clicked, waiting 5s...")
time.sleep(5)

# Check all windows and their controls
print("\n=== ALL WINDOWS ===")
for d in app.windows():
    t = d.window_text()
    print(f"\nWindow: '{t}'")
    if t:
        for c in d.descendants():
            try:
                ct = c.element_info.control_type
                wt = c.window_text()
                if ct in ("Button", "Edit", "Text", "ComboBox") and wt:
                    try:
                        en = "enabled" if c.is_enabled() else "disabled"
                    except:
                        en = ""
                    print(f"  [{ct}] \"{wt}\" ({en})")
            except:
                pass

app.kill()
