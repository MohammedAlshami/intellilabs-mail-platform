import os, time, re, ctypes, ctypes.wintypes
os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(1)

from pywinauto import Application, keyboard
import pyperclip

# Use win32 backend (what the user's working script used)
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

# Get all SysListView32 handles
lvs = main.descendants(class_name="SysListView32")
print(f"ListViews: {len(lvs)}")

for idx, lv in enumerate(lvs):
    hwnd = lv.handle
    hwnd_int = ctypes.c_int(hwnd).value  # Ensure 32-bit handle for 32-bit app
    print(f"\nLV {idx}: handle={hwnd} (int={hwnd_int})")
    
    # Use the 32-bit compatible SendMessage
    user32 = ctypes.windll.user32
    
    # Get item count via LVM_GETITEMCOUNT (0x1004)
    count = user32.SendMessageW(hwnd, 0x1004, 0, 0)
    print(f"  Item count: {count}")
    
    # Get column count
    col_count = user32.SendMessageW(hwnd, 0x101F, 0, 0)  # LVM_GETCOLUMNWIDTH -> 0 if no columns
    print(f"  Column info: {col_count}")
    
    if count > 0:
        # Try to read text from each item via WM_GETTEXT (0x000D)
        for i in range(min(count, 5)):
            buf = ctypes.create_string_buffer(1024)
            # Send WM_GETTEXT to the listview
            result = user32.SendMessageW(hwnd, 0x000D, 1024, ctypes.addressof(buf))
            text = buf.value.decode("utf-8", errors="replace") if buf.value else ""
            print(f"  Item {i}: '{text[:100]}' (result={result})")
            break  # WM_GETTEXT on the listview itself, not per-item
        
        # Try LVM_GETITEMTEXT with a different approach
        # LVM_GETITEMTEXT = 0x102D
        for i in range(min(count, 5)):
            buf = ctypes.create_string_buffer(512)
            # Use LVM_GETITEMTEXTW (unicode)
            class LVITEM(ctypes.Structure):
                _fields_ = [
                    ("mask", ctypes.c_uint),
                    ("iItem", ctypes.c_uint),
                    ("iSubItem", ctypes.c_uint),
                    ("state", ctypes.c_uint),
                    ("stateMask", ctypes.c_uint),
                    ("pszText", ctypes.c_uint),  # Use c_uint for 32-bit compat
                    ("cchTextMax", ctypes.c_uint),
                    ("iImage", ctypes.c_int),
                    ("lParam", ctypes.c_long),
                    ("iIndent", ctypes.c_int),
                ]
            
            item = LVITEM(mask=1, iItem=i, iSubItem=0, pszText=ctypes.addressof(buf), cchTextMax=256)
            result = user32.SendMessageW(hwnd, 0x102D, i, ctypes.byref(item))
            text = buf.value.decode("utf-8", errors="replace") if buf.value else ""
            if text.strip():
                print(f"  LVM_GETITEMTEXT: '{text[:100]}'")

# Also try to get the text from the main window
main_text = main.window_text()
print(f"\nMain window text: {main_text[:200]}")

# Try WM_GETTEXT on main window
buf = ctypes.create_string_buffer(4096)
ctypes.windll.user32.SendMessageW(main.handle, 0x000D, 4096, ctypes.addressof(buf))
window_text = buf.value.decode("utf-8", errors="replace") if buf.value else ""
print(f"WM_GETTEXT: {window_text[:500]}")

app.kill()
