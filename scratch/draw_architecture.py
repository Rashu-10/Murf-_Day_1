import os
from PIL import Image, ImageDraw, ImageFont

def draw_diagram():
    width, height = 1200, 650
    # Background: dark sleek modern navy
    image = Image.new("RGB", (width, height), color=(15, 23, 42))
    draw = ImageDraw.Draw(image)
    
    try:
        font_title = ImageFont.truetype("arial.ttf", 28)
        font_box = ImageFont.truetype("arial.ttf", 19)
        font_sub = ImageFont.truetype("arial.ttf", 14)
    except:
        font_title = ImageFont.load_default()
        font_box = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    # Draw Title
    draw.text((width // 2, 40), "MediBuddy AI — Real-Time Voice Architecture", fill=(255, 255, 255), font=font_title, anchor="mm")
    draw.text((width // 2, 75), "Powered by Murf Falcon TTS (~55ms) + LiveKit WebRTC + Deepgram STT + Gemini LLM", fill=(148, 163, 184), font=font_sub, anchor="mm")

    # Define Box drawing helper
    def draw_card(rect, bg_color, border_color, title, subtitle):
        x1, y1, x2, y2 = rect
        draw.rounded_rectangle([x1, y1, x2, y2], radius=12, fill=bg_color, outline=border_color, width=2)
        cx = (x1 + x2) // 2
        cy = (y1 + y2) // 2
        draw.text((cx, cy - 10), title, fill=(255, 255, 255), font=font_box, anchor="mm")
        draw.text((cx, cy + 14), subtitle, fill=(203, 213, 225), font=font_sub, anchor="mm")

    # Define arrow helper
    def draw_arrow(start, end, text="", color=(148, 163, 184)):
        x1, y1 = start
        x2, y2 = end
        draw.line([x1, y1, x2, y2], fill=color, width=3)
        # Arrow head
        if x2 > x1:
            draw.polygon([(x2, y2), (x2 - 10, y2 - 6), (x2 - 10, y2 + 6)], fill=color)
        elif x2 < x1:
            draw.polygon([(x2, y2), (x2 + 10, y2 - 6), (x2 + 10, y2 + 6)], fill=color)
        elif y2 > y1:
            draw.polygon([(x2, y2), (x2 - 6, y2 - 10), (x2 + 6, y2 - 10)], fill=color)
        elif y2 < y1:
            draw.polygon([(x2, y2), (x2 - 6, y2 + 10), (x2 + 6, y2 + 10)], fill=color)
        
        if text:
            tx = (x1 + x2) // 2
            ty = (y1 + y2) // 2 - 12
            draw.text((tx, ty), text, fill=(226, 232, 240), font=font_sub, anchor="mm")

    # Nodes
    # 1. User Mic
    draw_card((60, 150, 260, 240), (30, 41, 59), (51, 65, 85), "User Audio Input", "Browser Microphone")
    
    # Arrow 1 -> LiveKit Client
    draw_arrow((260, 195), (340, 195), "WebRTC Audio")
    
    # 2. LiveKit Client & Server
    draw_card((340, 150, 560, 240), (216, 90, 48), (240, 153, 123), "LiveKit Media Server", "Full-Duplex WebRTC")
    
    # Arrow 2 -> STT
    draw_arrow((560, 195), (640, 195), "Audio Stream")
    
    # 3. Deepgram STT
    draw_card((640, 150, 860, 240), (24, 95, 165), (133, 183, 235), "Deepgram STT", "Nova-2 Multilingual")
    
    # Arrow 3 -> LLM
    draw_arrow((750, 240), (750, 320), "Transcribed Text")
    
    # 4. LLM & Tools (Center Bottom Box)
    draw_card((540, 320, 960, 420), (83, 74, 183), (175, 169, 236), "LLM Orchestration", "Gemini 2.5 + Health Guardrails & Tools")

    # Arrow 4 -> Murf Falcon TTS
    draw_arrow((750, 420), (750, 500), "Response Text")

    # 5. Murf Falcon TTS (High Light Box)
    draw_card((540, 500, 960, 600), (15, 110, 86), (93, 202, 165), "Murf Falcon TTS", "55ms Ultra-Fast Streaming Audio")

    # Arrow 5 back to LiveKit
    draw_arrow((540, 550), (450, 550), "")
    draw_arrow((450, 550), (450, 240), "Audio Chunks", color=(93, 202, 165))

    # Output Arrow to Playback
    draw_card((60, 505, 260, 595), (30, 41, 59), (51, 65, 85), "Speaker Playback", "Live Human-like Speech")
    draw_arrow((340, 550), (260, 550), "Audio Stream")

    os.makedirs("blog_images", exist_ok=True)
    image.save("blog_images/architecture_diagram.png")

    # Copy to brain artifact folder as well
    os.makedirs("C:\\Users\\Rashu\\.gemini\\antigravity-ide\\brain\\ed30a0c4-f17a-4a05-8c8d-70ab0745955f", exist_ok=True)
    image.save("C:\\Users\\Rashu\\.gemini\\antigravity-ide\\brain\\ed30a0c4-f17a-4a05-8c8d-70ab0745955f\\architecture_diagram.png")
    print("Re-saved architecture_diagram.png successfully without broken glyphs!")

if __name__ == "__main__":
    draw_diagram()
