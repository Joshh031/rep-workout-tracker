#!/usr/bin/env python3
"""Regenerate REP PWA PNG icons from the canonical Plate Pulse SVG."""
from pathlib import Path
import cairosvg
root=Path(__file__).resolve().parents[1]
svg=(root/"public/plate-pulse.svg").read_bytes()
for size in (180,192,512):
    cairosvg.svg2png(bytestring=svg,write_to=str(root/f"public/icon-{size}.png"),output_width=size,output_height=size)
