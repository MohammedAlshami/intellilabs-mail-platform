import os, time, re, ctypes, ctypes.wintypes
from ctypes import wintypes

os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(1)

from pywinauto import Application, keyboard

# Launch the app and get it ready
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
print("Search complete. Now scanning memory...")

# Get process handle
pid = main.process_id()
print(f"PID: {pid}")

PROCESS_ALL_ACCESS = 0x1F0FFF
kernel32 = ctypes.windll.kernel32
handle = kernel32.OpenProcess(PROCESS_ALL_ACCESS, False, pid)
print(f"Process handle: {handle}")

# Read process memory to find emails
email_pattern = re.compile(rb"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")
found_emails = set()

# Scan memory regions using VirtualQueryEx
MEM_COMMIT = 0x1000
MEM_PRIVATE = 0x20000
PAGE_READABLE = 0x02 | 0x04 | 0x10 | 0x20 | 0x40 | 0x80

class MEMORY_BASIC_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("BaseAddress", ctypes.c_void_p),
        ("AllocationBase", ctypes.c_void_p),
        ("AllocationProtect", ctypes.c_uint),
        ("RegionSize", ctypes.c_size_t),
        ("State", ctypes.c_uint),
        ("Protect", ctypes.c_uint),
        ("Type", ctypes.c_uint),
    ]

addr = 0
page_size = 4096
scanned = 0
max_scan = 500 * 1024 * 1024  # 500MB max

while addr < max_scan:
    mbi = MEMORY_BASIC_INFORMATION()
    result = kernel32.VirtualQueryEx(handle, ctypes.c_void_p(addr), ctypes.byref(mbi), ctypes.sizeof(mbi))
    if result == 0:
        break
    
    if mbi.State == MEM_COMMIT and mbi.Protect & PAGE_READABLE and mbi.Type == MEM_PRIVATE:
        # Read this region
        buffer = ctypes.create_string_buffer(mbi.RegionSize)
        bytes_read = ctypes.c_size_t(0)
        if kernel32.ReadProcessMemory(handle, ctypes.c_void_p(addr), buffer, mbi.RegionSize, ctypes.byref(bytes_read)):
            chunk = buffer.raw[:bytes_read.value]
            for match in email_pattern.finditer(chunk):
                email = match.group().decode("utf-8", errors="replace")
                if email not in found_emails:
                    found_emails.add(email)
                    print(f"  Found: {email}")
    
    addr += mbi.RegionSize
    scanned += 1
    if scanned % 100 == 0:
        print(f"  Scanned: {addr // (1024*1024)} MB, found {len(found_emails)} emails")

kernel32.CloseHandle(handle)
print(f"\nTotal emails found: {len(found_emails)}")
for e in sorted(found_emails):
    print(f"  {e}")

app.kill()
