import time, os
os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(2)
from pywinauto import Application, keyboard
app = Application(backend="uia").start(r"C:\Program Files (x86)\Sky Email Extractor\Sky Email Extractor.exe")
time.sleep(5)
m = app.top_window()
m.set_focus()
time.sleep(1)

# Click Web Search tab first
try:
    t = m.child_window(title="Web Search", control_type="TabItem")
    t.click_input()
    print("Clicked Web Search tab")
    time.sleep(1)
except:
    print("Web Search tab not found")

# Enter URL with https://
i = m.child_window(auto_id="3005", control_type="Edit")
i.click_input()
time.sleep(0.3)
keyboard.send_keys("^a{DELETE}")
time.sleep(0.3)
keyboard.send_keys("https://ijo-bs.com")
time.sleep(0.5)

# Click Search
m.child_window(auto_id="3001", control_type="Button").click_input()
print("Search clicked, waiting 20s...")
time.sleep(20)

# Check grid
try:
    g = m.child_window(title="GridControl", control_type="Table")
    rows = g.descendants(control_type="Custom")
    print(f"\nGrid rows: {len(rows)}")
except:
    print("\nGrid: n/a")

# Check all text in the window
print("\nAll visible text:")
seen = set()
for c in m.descendants():
    try:
        wt = c.window_text()
        if wt and wt.strip() and wt not in seen:
            seen.add(wt)
            print(f"  \"{wt[:120]}\"")
    except:
        pass

# Check combo box value
try:
    cb = m.child_window(auto_id="1015", control_type="ComboBox")
    print(f"\nCountry/Region value: '{cb.get_value()}'")
except:
    print("\nCountry/Region: n/a")

app.kill()
