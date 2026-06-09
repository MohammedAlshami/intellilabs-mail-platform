import time, os
os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(2)

from pywinauto import Application, keyboard

app = Application(backend="uia").start(r"C:\Program Files (x86)\Sky Email Extractor\Sky Email Extractor.exe")
time.sleep(5)
main = app.top_window()
main.set_focus()
time.sleep(1)

print("=== INITIAL STATE ===")
# Print all top-level controls
for c in main.descendants():
    try:
        ct = c.element_info.control_type
        wt = c.window_text()
        if wt or ct in ("Tab", "TabItem", "Button", "Edit", "ComboBox"):
            print(f"  [{ct}] '{wt}'")
    except:
        pass

print("\n=== Clicking 'Web Search' tab ===")
try:
    web_tab = main.child_window(title="Web Search", control_type="TabItem")
    web_tab.click_input()
    print("Web Search tab clicked")
    time.sleep(1)
except Exception as e:
    print(f"Could not click Web Search tab: {e}")

print("\n=== Entering URL ===")
url_input = main.child_window(auto_id="3005", control_type="Edit")
url_input.click_input()
time.sleep(0.3)
keyboard.send_keys("^a{DELETE}")
time.sleep(0.3)
keyboard.send_keys("ijo-bs.com")
print("URL entered")
time.sleep(0.5)

print("\n=== Clicking Search ===")
search_btn = main.child_window(auto_id="3001", control_type="Button")
print(f"Enabled={search_btn.is_enabled()} Visible={search_btn.is_visible()}")
search_btn.click_input()
print("Search clicked")
time.sleep(10)

print("\n=== AFTER SEARCH ===")
print("Windows:")
for d in app.windows():
    t = d.window_text()
    if t:
        print(f"  '{t}'")
        if t != main.window_text():
            print("  *** MODAL ***")
            for c in d.descendants():
                try:
                    ct = c.element_info.control_type
                    wt = c.window_text()
                    if ct in ("Button", "Edit", "Text", "Static"):
                        print(f"    [{ct}] '{wt}'")
                except:
                    pass

# Check status bar
for c in main.descendants():
    try:
        ct = c.element_info.control_type
        if ct == "Edit" and c.is_visible():
            try:
                v = c.get_value()
                if v:
                    print(f"\nEdit field text: '{v}'")
            except:
                pass
    except:
        pass

# Grid
try:
    grid = main.child_window(title="GridControl", control_type="Table")
    rows = grid.descendants(control_type="Custom")
    print(f"Grid rows: {len(rows)}")
except Exception as e:
    print(f"Grid error: {e}")

print("\nApp closing in 5s...")
time.sleep(5)
app.kill()
