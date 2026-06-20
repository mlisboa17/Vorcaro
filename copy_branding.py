import shutil, os, sys

pairs = [
    (r"C:\Users\mlisb\.gemini\antigravity-ide\brain\b42848ce-171b-4625-afe5-002992787931\branding_page_1.png",
     r"C:\Users\mlisb\OneDrive\ProjetosAntigravy\Acessor30052026_Chat\public\branding\branding_page_1.png"),
    (r"C:\Users\mlisb\.gemini\antigravity-ide\brain\b42848ce-171b-4625-afe5-002992787931\branding_page_2.png",
     r"C:\Users\mlisb\OneDrive\ProjetosAntigravy\Acessor30052026_Chat\public\branding\branding_page_2.png"),
    (r"C:\Users\mlisb\.gemini\antigravity-ide\brain\b42848ce-171b-4625-afe5-002992787931\branding_page_3.png",
     r"C:\Users\mlisb\OneDrive\ProjetosAntigravy\Acessor30052026_Chat\public\branding\branding_page_3.png"),
    (r"C:\Users\mlisb\.gemini\antigravity-ide\brain\b42848ce-171b-4625-afe5-002992787931\branding_page_4.png",
     r"C:\Users\mlisb\OneDrive\ProjetosAntigravy\Acessor30052026_Chat\public\branding\branding_page_4.png"),
]

for src, dst in pairs:
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    size = os.path.getsize(dst)
    print("[OK] " + os.path.basename(dst) + " -> " + str(size) + " bytes")

print("Done.")
