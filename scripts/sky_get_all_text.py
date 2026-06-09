import os, time, re, ctypes
os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(1)
from pywinauto import Application, keyboard

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

# Use pywinauto to get all control text
email_re = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")
found_emails = set()
all_texts = []

for ctrl in main.descendants():
    try:
        text = ctrl.window_text()
        cls = ctrl.class_name()
        hwnd = ctrl.handle
        if text.strip():
            all_texts.append((hwnd, cls, text.strip()))
    except:
        pass

# Also get the main window status text
for ctrl_id in [2062, 3005, 3012]:
    try:
        txt = main.child_window(control_id=ctrl_id).window_text()
        if txt.strip():
            all_texts.append((0, "status", txt.strip()))
    except:
        pass

print(f"\nFound {len(all_texts)} text controls")
for hwnd, cls, text in all_texts:
    emails_in_text = email_re.findall(text)
    for e in emails_in_text:
        found_emails.add(e.lower())
    if emails_in_text or 'email' in text.lower() or '@' in text:
        print(f"  [{cls}] {text[:200]}")

print(f"\nTotal unique emails from window text: {len(found_emails)}")
for e in sorted(found_emails):
    print(f"  {e}")

app.kill()
