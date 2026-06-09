import time, os
os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(2)
from pywinauto import Application, keyboard

app = Application(backend="uia").start(r"C:\Program Files (x86)\Sky Email Extractor\Sky Email Extractor.exe")
time.sleep(5)
main = app.top_window()
main.set_focus()
time.sleep(1)

# Enter URL and search
url_input = main.child_window(auto_id="3005", control_type="Edit")
url_input.click_input()
time.sleep(0.3)
keyboard.send_keys("^a{DELETE}")
time.sleep(0.3)
keyboard.send_keys("ijo-bs.com")
time.sleep(0.5)
main.child_window(auto_id="3001", control_type="Button").click_input()
print("Search clicked, waiting for completion...")

# Wait for search to complete
for i in range(30):
    time.sleep(2)
    try:
        btn = main.child_window(auto_id="3001", control_type="Button")
        if btn.is_enabled():
            print(f"Search done ({i*2+2}s)")
            break
    except:
        pass

time.sleep(3)

# Now click Export to csv
print("Clicking Export to csv...")
main.child_window(title="Export to csv", control_type="Button").click_input()
time.sleep(5)

# Now look for the trial popup
print("\n=== AFTER EXPORT CLICK ===")
print("Searching for trial-related controls:")
for c in main.descendants():
    try:
        wt = c.window_text()
        ct = c.element_info.control_type
        if wt and any(k in wt.lower() for k in ["keep", "export email", "trial", "buy a", "got email", "limitation"]):
            print(f"  [{ct}] \"{wt}\"")
    except:
        pass

print("\nALL BUTTONS:")
seen = set()
for c in main.descendants():
    try:
        ct = c.element_info.control_type
        wt = c.window_text()
        if ct == "Button" and wt and wt not in seen:
            seen.add(wt)
            print(f"  [Button] \"{wt}\"")
    except:
        pass

app.kill()
