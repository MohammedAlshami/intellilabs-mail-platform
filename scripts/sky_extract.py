import sys, time, os, csv
from pywinauto import Application, keyboard

url = sys.argv[1] if len(sys.argv) > 1 else "ijo-bs.com"
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "scraped_data", f"sky_{int(time.time())}.csv")

os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(2)

app = Application(backend="uia").start(r"C:\Program Files (x86)\Sky Email Extractor\Sky Email Extractor.exe")
time.sleep(5)
main = app.top_window()
main.set_focus()
time.sleep(1)

# Click Web Search tab
main.child_window(title="Web Search", control_type="TabItem").click_input()
time.sleep(1)

# Enter URL
main.child_window(auto_id="3005", control_type="Edit").click_input()
time.sleep(0.3)
keyboard.send_keys("^a{DELETE}")
time.sleep(0.3)
keyboard.send_keys(url)
time.sleep(0.5)

# Click Search
main.child_window(auto_id="3001", control_type="Button").click_input()
print("1. Search clicked")
time.sleep(3)

# Click Ok (confirms settings)
try:
    main.child_window(title="Ok", control_type="Button").click_input()
    print("2. Clicked Ok")
    time.sleep(2)
except:
    print("2. No Ok button")

# Wait for search to finish
print("3. Waiting for results...")
for i in range(45):
    time.sleep(2)
    try:
        if main.child_window(auto_id="3001", control_type="Button").is_enabled():
            print(f"4. Search done ({i*2+2}s)")
            break
    except:
        pass

time.sleep(2)

# Function to dismiss trial popup if present
def dismiss_trial():
    for btn_text in ["Keep on trial version", "Keep on trial"]:
        try:
            b = main.child_window(title=btn_text, control_type="Button")
            if b.exists() and b.is_visible():
                b.click_input()
                print("   Dismissed trial popup")
                time.sleep(2)
                return True
        except:
            pass
    return False

# Function to click export button in trial popup
def click_trial_export():
    try:
        b = main.child_window(title="Export email to csv (Email, URL)", control_type="Button")
        if b.exists() and b.is_visible():
            b.click_input()
            print("   Used trial export button")
            time.sleep(3)
            return True
    except:
        pass
    return False

# Handle initial trial popup
dismiss_trial()

# Try to export
if not click_trial_export():
    # Click main Export to csv
    main.child_window(title="Export to csv", control_type="Button").click_input()
    print("5. Export to csv clicked")
    time.sleep(3)
    # Handle trial popup that appears
    dismiss_trial()
    # Try again
    main.child_window(title="Export to csv", control_type="Button").click_input()
    print("6. Export to csv clicked (2nd attempt)")
    time.sleep(3)

# Handle any save dialog
for _ in range(10):
    for d in app.windows():
        t = d.window_text()
        if t and t != main.window_text() and ("Save" in t or "Export" in t or "speichern" in t.lower()):
            print(f"7. Save dialog: '{t}'")
            try:
                edit = d.child_window(control_type="Edit")
                edit.click_input()
                time.sleep(0.3)
                keyboard.send_keys("^a{DELETE}")
                time.sleep(0.3)
                keyboard.send_keys(out)
                time.sleep(0.3)
                keyboard.send_keys("{ENTER}")
                time.sleep(2)
            except:
                pass
            break
    time.sleep(2)

time.sleep(3)
app.kill()

if os.path.exists(out):
    print(f"\n8. SUCCESS: {out} ({os.path.getsize(out)} bytes)")
    with open(out, newline="", encoding="utf-8") as f:
        for row in csv.reader(f):
            print(f"   {row}")
else:
    print(f"\n8. FAILED: No file at {out}")
    # List scraped_data dir
    for f in os.listdir(os.path.dirname(out)):
        print(f"   Found: {f}")
