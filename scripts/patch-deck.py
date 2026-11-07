from pathlib import Path
p = Path(r'D:\Projectweb\scripts\make-cappan-deck.py')
s = p.read_text(encoding='utf-8')
s = s.replace("font='Segoe UI'", "font='Arial'")
s = s.replace("'Georgia'", "'Arial'")
s = s.replace(
    "def title(s, txt, sub=None):\n    text(s, txt, 0.65, 0.78, 12.0, 0.75, 34, CREAM, True, 'Arial')",
    "def title(s, txt, sub=None, size=34):\n    text(s, txt, 0.65, 0.78, 12.0, 0.75, size, CREAM, True, 'Arial')"
)
s = s.replace(
    "title(s, 'Bốn service mode. Booking là cờ, không phải mode.', 'Một hệ thống, bốn lời hứa dịch vụ.')",
    "title(s, 'Bốn service mode. Booking không phải mode.', 'Một hệ thống, bốn lời hứa dịch vụ.', 28)"
)
old = """for i, (n, h, b) in enumerate(steps):
    x = 0.65 + i * 3.15
    card(s, x, 2.15, 2.9, 3.35, CARD, GOLD if i == 1 else None)
    text(s, n, x + 0.22, 2.38, 0.6, 0.3, 10, GOLD, True)
    text(s, h, x + 0.22, 2.8, 2.5, 0.45, 18, CREAM, True, 'Arial')
    text(s, b, x + 0.22, 3.55, 2.5, 0.9, 11, MUTED)
    if i < 3:
        text(s, '→', x + 2.92, 3.45, 0.25, 0.3, 15, GOLD, True)"""
new = """for i, (n, h, b) in enumerate(steps):
    x = 0.55 + i * 3.15
    card(s, x, 2.15, 2.95, 3.35, CARD, GOLD if i == 1 else None)
    text(s, n, x + 0.18, 2.35, 0.5, 0.3, 10, GOLD, True)
    text(s, h, x + 0.18, 2.75, 2.6, 0.45, 16, CREAM, True, 'Arial')
    text(s, b, x + 0.18, 3.45, 2.6, 1.15, 9.5, MUTED)"""
if old not in s:
    raise SystemExit('slide8 block not found')
s = s.replace(old, new)
p.write_text(s, encoding='utf-8')
print('patched')
