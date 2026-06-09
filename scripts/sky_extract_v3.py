import os, time, re, ctypes
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

# Get the results grid handle using control_id
# The grid has control_id 2062 (status area) - but we need the actual results grid
# From the user's script, the listviews were found

lvs = main.descendants(class_name="SysListView32")
print(f"ListViews: {len(lvs)}")

# Try to focus the grid by clicking its area via Win32 API PostMessage
# Instead of click_input(), send WM_SETFOCUS directly
for lv in lvs:
    handle = lv.handle
    lv_handle = ctypes.c_long(handle).value  # Ensure 32-bit
    
    # Send WM_SETFOCUS (0x0007) directly - no mouse
    ctypes.windll.user32.PostMessageW(lv_handle, 0x0007, 0, 0)
    time.sleep(0.3)
    
    # Send ^a (select all) via WM_CHAR or WM_KEYDOWN
    # Ctrl+A = 0x01, VK_CONTROL = 0x11, VK_A = 0x41
    ctypes.windll.user32.PostMessageW(lv_handle, 0x0100, 0x11, 0)  # WM_KEYDOWN Ctrl
    ctypes.windll.user32.PostMessageW(lv_handle, 0x0100, 0x41, 0)  # WM_KEYDOWN A
    ctypes.windll.user32.PostMessageW(lv_handle, 0x0101, 0x41, 0)  # WM_KEYUP A
    ctypes.windll.user32.PostMessageW(lv_handle, 0x0101, 0x11, 0)  # WM_KEYUP Ctrl
    time.sleep(0.5)
    
    # Send ^c (copy)
    ctypes.windll.user32.PostMessageW(lv_handle, 0x0100, 0x11, 0)  # WM_KEYDOWN Ctrl
    ctypes.windll.user32.PostMessageW(lv_handle, 0x0100, 0x43, 0)  # WM_KEYDOWN C
    ctypes.windll.user32.PostMessageW(lv_handle, 0x0101, 0x43, 0)  # WM_KEYUP C
    ctypes.windll.user32.PostMessageW(lv_handle, 0x0101, 0x11, 0)  # WM_KEYUP Ctrl
    time.sleep(0.5)
    
    clip = pyperclip.paste()
    print(f"LV clipboard ({len(clip)} chars): {clip[:200]}")
    if clip:
        break

# If no clipboard content, try PostMessage to the main window
if not pyperclip.paste():
    hwnd = ctypes.c_long(main.handle).value
    ctypes.windll.user32.PostMessageW(hwnd, 0x0007, 0, 0)  # WM_SETFOCUS
    time.sleep(0.3)
    # Send ^a
    for key in [0x11, 0x41]:  # Ctrl, A
        ctypes.windll.user32.PostMessageW(hwnd, 0x0100, key, 0)
    time.sleep(0.1)
    for key in [0x41, 0x11]:  # A, Ctrl
        ctypes.windll.user32.PostMessageW(hwnd, 0x0101, key, 0)
    time.sleep(0.5)
    # Send ^c
    for key in [0x11, 0x43]:  # Ctrl, C
        ctypes.windll.user32.PostMessageW(hwnd, 0x0100, key, 0)
    time.sleep(0.1)
    for key in [0x43, 0x11]:  # C, Ctrl
        ctypes.windll.user32.PostMessageW(hwnd, 0x0101, key, 0)
    time.sleep(0.5)
    clip = pyperclip.paste()
    print(f"Main clipboard ({len(clip)} chars): {clip[:200]}")

clip = pyperclip.paste()
emails = re.findall(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", clip)
print(f"\nTotal emails: {len(emails)}")
for e in sorted(set(emails)):
    print(f"  {e}")

app.kill()
