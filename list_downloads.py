import os
downloads = r"C:\Users\mlisb\Downloads"
try:
    files = os.listdir(downloads)
    print("Files in Downloads:")
    for f in files:
        if "poppler" in f.lower() or "release" in f.lower():
            print(f"- {f} (size: {os.path.getsize(os.path.join(downloads, f))} bytes)")
except Exception as e:
    print(f"Error listing Downloads: {e}")
