import urllib.request
import json
import zipfile
import io
import os
import shutil

def main():
    api_url = "https://api.github.com/repos/oschwartz10612/poppler-windows/releases/latest"
    print(f"Fetching latest release info from: {api_url}")
    
    headers = {"User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(api_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
    except Exception as e:
        print(f"Failed to fetch release info: {e}")
        return
        
    zip_url = None
    for asset in data.get("assets", []):
        name = asset.get("name", "")
        if name.endswith(".zip") and "src" not in name.lower():
            zip_url = asset.get("browser_download_url")
            print(f"Found ZIP asset: {name} at {zip_url}")
            break
            
    if not zip_url:
        print("No zip asset found in the latest release.")
        return
        
    # Download zip file
    print(f"Downloading {zip_url}...")
    try:
        req_zip = urllib.request.Request(zip_url, headers=headers)
        with urllib.request.urlopen(req_zip) as zip_res:
            zip_data = zip_res.read()
    except Exception as e:
        print(f"Failed to download ZIP: {e}")
        return
        
    print("Download completed. Extracting to C:\\Program Files\\poppler ...")
    
    # Extract to target directory
    target_dir = r"C:\Program Files\poppler"
    
    try:
        if os.path.exists(target_dir):
            print(f"Cleaning existing directory: {target_dir}")
            try:
                shutil.rmtree(target_dir)
            except Exception as e:
                print(f"Failed to remove existing directory: {e}")
        
        os.makedirs(target_dir, exist_ok=True)
        
        with zipfile.ZipFile(io.BytesIO(zip_data)) as z:
            members = z.namelist()
            print(f"Extracting {len(members)} files...")
            z.extractall(target_dir)
            
        extracted_dirs = [d for d in os.listdir(target_dir) if os.path.isdir(os.path.join(target_dir, d))]
        if len(extracted_dirs) == 1 and not os.path.exists(os.path.join(target_dir, "Library")):
            single_dir = os.path.join(target_dir, extracted_dirs[0])
            print(f"Moving contents from nested folder: {single_dir} to {target_dir}")
            for item in os.listdir(single_dir):
                shutil.move(os.path.join(single_dir, item), os.path.join(target_dir, item))
            os.rmdir(single_dir)
            
        print("Poppler extraction complete and structured successfully in C:\\Program Files\\poppler!")
    except PermissionError as pe:
        print(f"PermissionError on C:\\Program Files\\poppler: {pe}")
        print("Creating directory in user's profile instead...")
        fallback_dir = r"C:\Users\mlisb\poppler"
        try:
            if os.path.exists(fallback_dir):
                shutil.rmtree(fallback_dir)
            os.makedirs(fallback_dir, exist_ok=True)
            with zipfile.ZipFile(io.BytesIO(zip_data)) as z:
                z.extractall(fallback_dir)
            extracted_dirs = [d for d in os.listdir(fallback_dir) if os.path.isdir(os.path.join(fallback_dir, d))]
            if len(extracted_dirs) == 1 and not os.path.exists(os.path.join(fallback_dir, "Library")):
                single_dir = os.path.join(fallback_dir, extracted_dirs[0])
                for item in os.listdir(single_dir):
                    shutil.move(os.path.join(single_dir, item), os.path.join(fallback_dir, item))
                os.rmdir(single_dir)
            print(f"Poppler extracted successfully to fallback location: {fallback_dir}")
        except Exception as e:
            print(f"Failed fallback extraction: {e}")

if __name__ == "__main__":
    main()
