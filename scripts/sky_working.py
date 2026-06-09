import os, time, re
os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(1)
from pywinauto import Application, keyboard
import pyperclip

app = Application(backend="win32").start(r'"C:\Program Files (x86)\Sky Email Extractor\Sky Email Extractor.exe"')
time.sleep(4)
main = app.window(title_re=r"Sky Email Extractor.*Trial.*")
main.restore(); main.set_focus()

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

# Focus the grid by clicking it (this is the only way CEF registers focus)
main.click_input(coords=(500, 450))
time.sleep(0.5)

# Select all via real keyboard input
keyboard.send_keys("^a")
time.sleep(1)

# Copy via real keyboard input  
keyboard.send_keys("^c")
time.sleep(1)

clip = pyperclip.paste()
print(f"Clipboard ({len(clip)} chars)")

emails = re.findall(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", clip)
print(f"Emails found: {len(emails)}")
for e in sorted(set(emails)):
    print(f"  {e}")

app.kill()
