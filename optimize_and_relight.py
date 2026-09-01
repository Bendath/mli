import os
from PIL import Image, ImageEnhance, ImageOps

def process_image(input_path, output_path, max_width=1600, warmth=1.1, contrast=1.1, brightness=1.05, vignette_strength=0.3):
    if not os.path.exists(input_path):
        print(f"File not found: {input_path}")
        return False
    
    img = Image.open(input_path).convert("RGB")
    
    # Resize keeping aspect ratio
    w, h = img.size
    if w > max_width:
        new_h = int(h * (max_width / float(w)))
        img = img.resize((max_width, new_h), Image.Resampling.LANCZOS)
    
    # Contrast adjustment
    enh_con = ImageEnhance.Contrast(img)
    img = enh_con.enhance(contrast)
    
    # Brightness adjustment
    enh_bri = ImageEnhance.Brightness(img)
    img = enh_bri.enhance(brightness)
    
    # Warmth tinting (subtle golden tone boost)
    r, g, b = img.split()
    r = r.point(lambda i: min(255, int(i * warmth)))
    g = g.point(lambda i: min(255, int(i * (1.0 + (warmth - 1.0)*0.5))))
    img = Image.merge("RGB", (r, g, b))
    
    # Color saturation boost
    enh_col = ImageEnhance.Color(img)
    img = enh_col.enhance(1.08)
    
    # Save as WebP with high quality
    img.save(output_path, "WEBP", quality=88)
    size_kb = os.path.getsize(output_path) / 1024.0
    print(f"Processed {os.path.basename(input_path)} -> {os.path.basename(output_path)} ({size_kb:.1f} KB)")
    return True

if __name__ == "__main__":
    targets = [
        ("IMG20260824120421.jpg", "mli_chair_guitar.webp", 1600),
        ("IMG20260824091923.jpg", "mli_portrait_wall.webp", 1600),
        ("IMG20260816115406.jpg", "mli_glasses_portrait.webp", 1600),
        ("IMG20260816115014.jpg", "mli_stone_wall.webp", 1600),
        ("IMG20260819105351.jpg", "mli_stage_mic.webp", 1600),
        ("IMG20260819105412.jpg", "mli_hero_headphones.webp", 1600)
    ]
    
    base_dir = r"c:\Users\Bruger\Documents\AI\MLI"
    for inp, out, mw in targets:
        in_p = os.path.join(base_dir, inp)
        out_p = os.path.join(base_dir, out)
        process_image(in_p, out_p, max_width=mw)
