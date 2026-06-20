from pdf2image import convert_from_path
import os

POPPLER_BIN_PATH = r"C:\\Users\\mlisb\\OneDrive\\ProjetosAntigravy\\Acessor30052026_Chat\\poppler\\poppler-26.02.0\\Library\\bin"
if not os.path.isdir(POPPLER_BIN_PATH):
    raise FileNotFoundError(f"Poppler bin not found at {POPPLER_BIN_PATH}")

print(f"Using poppler bin path: {POPPLER_BIN_PATH}")

pages = convert_from_path(
    r'C:\Users\mlisb\Downloads\Branding Vorcaro - Identidade Visual & Código (2).pdf', 
    dpi=150,
    poppler_path=POPPLER_BIN_PATH
)

out_dir = r'C:\Users\mlisb\.gemini\antigravity-ide\brain\b42848ce-171b-4625-afe5-002992787931'
os.makedirs(out_dir, exist_ok=True)
for i, page in enumerate(pages):
    path = os.path.join(out_dir, f'branding_page_{i+1}.png')
    page.save(path, 'PNG')
    print(f'Saved: {path}')
print('Done')
