import time, os
os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(2)
from pywinauto import Application, keyboard
app = Application(backend="uia").start(r"C:\Program Files (x86)\Sky Email Extractor\Sky Email Extractor.exe")
time.sleep(5)
m = app.top_window()
m.set_focus()
time.sleep(1)

m.child_window(title="Web Search", control_type="TabItem").click_input()
time.sleep(1)

i = m.child_window(auto_id="3005", control_type="Edit")
i.click_input()
time.sleep(0.3)
keyboard.send_keys("^a{DELETE}")
time.sleep(0.3)
keyboard.send_keys("ijo-bs.com")
time.sleep(0.5)

m.child_window(auto_id="3001", control_type="Button").click_input()
print("Search clicked")

# Check for new windows every second for 10 seconds
for sec in range(10):
    time.sleep(1)
    wins = [f"'{d.window_text()}'" for d in app.windows()]
    print(f"  Sec {sec+1}: {wins}")
    # Check for Ok button
    try:
        ok = m.child_window(title="Ok", control_type="Button")
        if ok.exists() and ok.is_visible():
            print(f"  >>> Found Ok button at sec {sec+1}")
    except:
        pass

app.kill()
