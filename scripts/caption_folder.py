#!/usr/bin/env python3
"""
Batch-caption a folder of photos via an OpenAI-compatible vision API.

Usage
-----
    python3 scripts/caption_folder.py <folder> [--event "Title"]

What it does
------------
- Reads every .jpg / .jpeg / .png in <folder> (sorted by filename).
- For each photo, asks the vision model for a short, plain caption
  in the voice of "a note someone might write on the back of a printed
  photo" — at most 8 English words, no quotes, no fluff.
- Writes the result to <folder>/captions.txt, one per line:

      01: First sunrise from the car window
      02: Rainbow over rice terraces

The line key is the file's stem (filename without extension), so if
you name your photos 01.jpg / 02.jpg / ... the key is 01 / 02 / ...
This matches what mock-data.json wants.

Config
------
The endpoint, key, and model are read from environment variables.
A .env file at the repo root (or in CWD) is loaded automatically; copy
.env.example to .env and fill it in.

    CAPTION_API_URL    default: https://jeniya.cn/v1/chat/completions
    CAPTION_API_KEY    required (no default — set in env or .env)
    CAPTION_MODEL      default: gpt-4o (verified working on jeniya proxy)

To try another model temporarily:

    CAPTION_MODEL=gpt-4o-mini python3 scripts/caption_folder.py photos/grad

Re-runs are idempotent unless --overwrite is passed.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

# ---- Config (env / .env, no defaults baked in) ------------------------------


def _load_dotenv(path: str) -> None:
    """Load KEY=VALUE pairs from a .env file into os.environ (no overwrite)."""
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip("'\"")
            if k and k not in os.environ:
                os.environ[k] = v


# Look for .env in CWD first, then repo root (one dir above scripts/).
_HERE = os.path.dirname(os.path.abspath(__file__))
for _candidate in (".env", os.path.join(_HERE, "..", ".env")):
    _load_dotenv(_candidate)

API_URL = os.environ.get("CAPTION_API_URL", "https://jeniya.cn/v1/chat/completions")
API_KEY = os.environ.get("CAPTION_API_KEY", "")
MODEL = os.environ.get("CAPTION_MODEL", "gpt-4o")
# tested on https://jeniya.cn proxy 2026-05-10:
#   gpt-4o   ✅ returns sensible captions
#   gpt-5.5  ❌ returns empty content; do not use unless the proxy fixes it

PROMPT = """\
This image is one frame from a personal photo event called "{event}".
Write a single caption for this photo — like a short note someone
might scribble on the back of a printed photo.

Rules:
- One line, at most 8 English words.
- Plain and sensory, not a list of adjectives.
- Don't repeat the event name.
- Don't wrap the caption in quotes.
- No trailing period.
"""

# ---- Helpers ----------------------------------------------------------------


def encode_image(path: str) -> tuple[str, str]:
    with open(path, "rb") as f:
        data = f.read()
    ext = os.path.splitext(path)[1].lstrip(".").lower()
    if ext == "jpg":
        ext = "jpeg"
    if ext not in {"jpeg", "png", "webp"}:
        raise ValueError(f"Unsupported image type: {path}")
    return ext, base64.b64encode(data).decode("ascii")


def caption_image(path: str, event: str, *, retries: int = 2) -> str:
    ext, b64 = encode_image(path)
    image_url = f"data:image/{ext};base64,{b64}"

    body = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT.format(event=event)},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ],
        "max_tokens": 60,
        "temperature": 0.6,
    }

    payload = json.dumps(body).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    }

    last_err: Exception | None = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(
                API_URL, data=payload, headers=headers, method="POST"
            )
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read())
            text = data["choices"][0]["message"]["content"].strip()
            # Strip wrapping quotes / trailing period defensively.
            if len(text) >= 2 and text[0] in {'"', "“", "'"} and text[-1] in {'"', "”", "'"}:
                text = text[1:-1].strip()
            text = text.rstrip(".。")
            return text
        except urllib.error.HTTPError as e:
            body_text = e.read().decode("utf-8", errors="replace")
            last_err = RuntimeError(f"HTTP {e.code}: {body_text[:200]}")
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            last_err = e
        if attempt < retries:
            time.sleep(1.5 * (attempt + 1))

    assert last_err is not None
    raise last_err


# ---- Main -------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n", 1)[0])
    parser.add_argument("folder", help="folder containing photos")
    parser.add_argument(
        "--event",
        default=None,
        help="event title fed to the prompt (defaults to folder basename)",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="rewrite captions.txt even if it already exists",
    )
    parser.add_argument(
        "--pace",
        type=float,
        default=0.4,
        help="seconds to wait between API calls (default 0.4)",
    )
    args = parser.parse_args()

    if not API_KEY:
        print(
            "CAPTION_API_KEY is not set.\n"
            "  - Either: export CAPTION_API_KEY=sk-...\n"
            "  - Or copy .env.example to .env at the repo root and fill it in.",
            file=sys.stderr,
        )
        return 2

    folder = os.path.abspath(args.folder)
    if not os.path.isdir(folder):
        print(f"Not a folder: {folder}", file=sys.stderr)
        return 2

    event = args.event or os.path.basename(folder).replace("_", " ").replace("-", " ")

    files = sorted(
        f
        for f in os.listdir(folder)
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
        and not f.startswith(".")
    )
    if not files:
        print(f"No image files in {folder}", file=sys.stderr)
        return 2

    out_path = os.path.join(folder, "captions.txt")
    if os.path.exists(out_path) and not args.overwrite:
        print(
            f"{out_path} exists already. "
            f"Pass --overwrite to redo, or delete it.",
            file=sys.stderr,
        )
        return 1

    print(f"folder : {folder}")
    print(f"event  : {event}")
    print(f"model  : {MODEL}")
    print(f"images : {len(files)}\n")

    lines: list[str] = []
    for i, fname in enumerate(files, 1):
        full = os.path.join(folder, fname)
        sys.stdout.write(f"  [{i:02d}/{len(files):02d}] {fname:24s} ")
        sys.stdout.flush()
        try:
            caption = caption_image(full, event)
        except Exception as e:
            print(f"FAILED: {e}")
            caption = "(caption failed)"
        else:
            print(caption)
        stem = os.path.splitext(fname)[0]
        lines.append(f"{stem}: {caption}")
        time.sleep(args.pace)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"\nwrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
