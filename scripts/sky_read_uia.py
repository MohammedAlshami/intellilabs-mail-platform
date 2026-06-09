import os, time, re
os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(1)
from pywinauto import Application, keyboard
import pyperclip

app = Application(backend="uia").start(r"C:\Program Files (x86)\Sky Email Extractor\Sky Email Extractor.exe")
time.sleep(5)
main = app.top_window()
main.restore()
main.set_focus()
time.sleep(1)

# Enter URL and search
main.child_window(auto_id="3005", control_type="Edit").click_input()
time.sleep(0.3)
keyboard.send_keys("^a{DELETE}")
time.sleep(0.3)
keyboard.send_keys("ijo-bs.com")
time.sleep(0.5)
main.child_window(auto_id="3001", control_type="Button").click_input()
time.sleep(2)

# Handle Settings dialog
try:
    s = app.window(title="Settings")
    if s.exists(timeout=3):
        s.child_window(title="Ok", control_type="Button").click_input()
        time.sleep(1)
except:
    pass

# Wait for trial popup
for _ in range(90):
    time.sleep(1)
    try:
        t = app.window(title="Sky Email Extractor")
        if t.exists(timeout=0.5):
            t.child_window(control_id=11085).click_input()
            break
    except:
        pass

time.sleep(2)

# Click the GridControl to focus it
try:
    grid = main.child_window(title="GridControl", control_type="Table")
    rect = grid.rectangle()
    print(f"Grid rect: {rect}")
    # Click inside the grid
    grid.click_input()
    time.sleep(0.5)
    
    # Select all and copy
    keyboard.send_keys("^a")
    time.sleep(0.5)
    keyboard.send_keys("^c")
    time.sleep(0.5)
    
    clip = pyperclip.paste()
    print(f"Clipboard length: {len(clip)}")
    print(f"Clipboard preview: {clip[:500]}")
    
    emails = re.findall(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", clip)
    print(f"\nEmails found: {len(emails)}")
    for e in sorted(set(emails)):
        print(f"  {e}")
except Exception as e:
    print(f"Grid error: {e}")
    # Fall back to clicking the listview area
    main.click_input(coords=(400, 400))
    time.sleep(0.3)
    keyboard.send_keys("^a")
    time.sleep(0.3)
    keyboard.send_keys("^c")
    time.sleep(0.5)
    clip = pyperclip.paste()
    emails = re.findall(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", clip)
    print(f"Fallback emails: {len(emails)}")
    for e in sorted(set(emails)):
        print(f"  {e}")

app.kill()
