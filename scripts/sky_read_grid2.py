import os, time, re
os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(1)

from pywinauto import Application, keyboard

app = Application(backend="win32").start(r"C:\Program Files (x86)\Sky Email Extractor\Sky Email Extractor.exe")
time.sleep(4)
main = app.window(title_re=r"Sky Email Extractor.*Trial.*")
main.restore()
main.set_focus()
main.child_window(control_id=3005).set_edit_text("ijo-bs.com")
main.child_window(control_id=3001).click_input()
time.sleep(2)
s = app.window(title="Settings", class_name="#32770")
if s.exists(timeout=5):
    s.child_window(control_id=1).click_input()

for _ in range(90):
    time.sleep(1)
    t = app.window(title="Sky Email Extractor", class_name="#32770")
    if t.exists(timeout=0.5):
        t.child_window(control_id=11085).click_input()
        break

time.sleep(2)
status = main.child_window(control_id=2062).window_text()
print("Status:", status)

# Try using pywinauto's built-in ListView support
lvs = main.descendants(class_name="SysListView32")
print(f"ListViews: {len(lvs)}")

for i, lv in enumerate(lvs):
    print(f"\nLV {i}:")
    print(f"  Text: {lv.window_text()}")
    print(f"  Visible: {lv.is_visible()}")
    try:
        cols = lv.column_count()
        print(f"  Columns: {cols}")
    except:
        cols = 0
    
    try:
        items = lv.texts()
        print(f"  Texts: {items[:5]}")
    except Exception as e:
        print(f"  Texts error: {e}")
    
    # Try to get item count via properties
    try:
        count = lv.item_count()
        print(f"  Item count: {count}")
    except Exception as e:
        print(f"  Item count error: {e}")
    
    # Try selecting and reading via clipboard
    try:
        lv.click_input()
        time.sleep(0.3)
        keyboard.send_keys("^a")
        time.sleep(0.3)
        keyboard.send_keys("^c")
        time.sleep(0.5)
        import pyperclip
        clip = pyperclip.paste()
        emails_found = re.findall(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", clip)
        print(f"  Clipboard emails: {emails_found}")
    except Exception as e:
        print(f"  Clipboard error: {e}")

app.kill()
