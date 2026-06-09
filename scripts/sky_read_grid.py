import os, time, re, ctypes, ctypes.wintypes
os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(1)

from pywinauto import Application, keyboard

# Win32 API constants for ListView
LVM_GETITEMCOUNT = 0x1004
LVM_GETITEMTEXT = 0x102D
LVM_GETITEM = 0x1005
LVIF_TEXT = 0x0001

class LVITEM(ctypes.Structure):
    _fields_ = [
        ("mask", ctypes.c_uint),
        ("iItem", ctypes.c_int),
        ("iSubItem", ctypes.c_int),
        ("state", ctypes.c_uint),
        ("stateMask", ctypes.c_uint),
        ("pszText", ctypes.c_char_p),
        ("cchTextMax", ctypes.c_int),
        ("iImage", ctypes.c_int),
        ("lParam", ctypes.c_long),
        ("iIndent", ctypes.c_int),
    ]

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

# Get the ListView handle
lvs = main.descendants(class_name="SysListView32")
print(f"ListViews found: {len(lvs)}")

for idx, lv in enumerate(lvs):
    rect = lv.rectangle()
    print(f"  LV {idx}: rect={rect}, visible={lv.is_visible()}, handle={lv.handle}")

    if not lv.is_visible():
        # Try to make it visible by clicking
        lv.click_input()
        time.sleep(0.5)

    # Use Win32 API to read items
    hwnd = lv.handle
    count = ctypes.windll.user32.SendMessageW(hwnd, LVM_GETITEMCOUNT, 0, 0)
    print(f"  Item count via API: {count}")

    if count > 0:
        emails = set()
        for i in range(count):
            buf = ctypes.create_string_buffer(512)
            item = LVITEM(
                mask=LVIF_TEXT,
                iItem=i,
                iSubItem=0,
                pszText=ctypes.cast(buf, ctypes.c_char_p),
                cchTextMax=512,
            )
            ctypes.windll.user32.SendMessageW(hwnd, LVM_GETITEMTEXT, i, ctypes.byref(item))
            text = buf.value.decode("utf-8", errors="replace") if buf.value else ""
            
            # Also try subitem 1 (second column)
            buf2 = ctypes.create_string_buffer(512)
            item2 = LVITEM(
                mask=LVIF_TEXT,
                iItem=i,
                iSubItem=1,
                pszText=ctypes.cast(buf2, ctypes.c_char_p),
                cchTextMax=512,
            )
            ctypes.windll.user32.SendMessageW(hwnd, LVM_GETITEMTEXT, i, ctypes.byref(item2))
            text2 = buf2.value.decode("utf-8", errors="replace") if buf2.value else ""

            combined = text + " " + text2
            found = re.findall(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", combined)
            for e in found:
                emails.add(e.lower())

        if emails:
            print(f"  Found {len(emails)} emails:")
            for e in sorted(emails):
                print(f"    {e}")
        break

app.kill()
