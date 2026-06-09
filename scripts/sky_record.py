import time, os, sys
log_path = os.path.join(os.path.dirname(__file__), "..", "scraped_data", "sky_record.log")

os.system("taskkill /f /im \"Sky Email Extractor.exe\" 2>nul")
time.sleep(2)

from pywinauto import Application

app = Application(backend="uia").start(r"C:\Program Files (x86)\Sky Email Extractor\Sky Email Extractor.exe")
time.sleep(4)

with open(log_path, "w", encoding="utf-8") as f:
    f.write("=== SKY EMAIL EXTRACTOR RECORDING ===\n")
    f.write(f"Started at: {time.ctime()}\n\n")

    for sec in range(30):
        f.write(f"\n--- Second {sec+1} ---\n")
        try:
            # Log all windows
            f.write(f"Windows ({len(app.windows())}):\n")
            for d in app.windows():
                t = d.window_text()
                if t:
                    f.write(f"  '{t}'\n")
        except Exception as e:
            f.write(f"  Error getting windows: {e}\n")

        try:
            main = app.top_window()
            f.write(f"Top window: '{main.window_text()}'\n")
            # Log all visible buttons/edits
            for c in main.descendants():
                try:
                    ct = c.element_info.control_type
                    wt = c.window_text()
                    if wt and ct in ("Button", "Edit", "TabItem", "Text", "Static"):
                        try:
                            en = "enabled" if c.is_enabled() else "disabled"
                            vi = "visible" if c.is_visible() else "hidden"
                            f.write(f"  [{ct}] '{wt}' ({en}, {vi})\n")
                        except:
                            f.write(f"  [{ct}] '{wt}'\n")
                except:
                    pass
        except Exception as e:
            f.write(f"  Error: {e}\n")

        f.flush()
        time.sleep(1)

f.write("\n=== RECORDING ENDED ===\n")

app.kill()
print(f"Log saved to: {log_path}")
