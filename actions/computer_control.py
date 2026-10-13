#computer_control.py
import io
import json
import platform
import re
import string
import subprocess
import sys

if platform.system() == "Windows":
    _WIN_HIDE: dict = {"creationflags": subprocess.CREATE_NO_WINDOW}
else:
    _WIN_HIDE: dict = {}
import time
import random
from pathlib import Path

try:
    import pyautogui
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE    = 0.05
    _PYAUTOGUI = True
except ImportError:
    _PYAUTOGUI = False

try:
    import pyperclip
    _PYPERCLIP = True
except ImportError:
    _PYPERCLIP = False

def _base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


_BASE         = _base_dir()
_CONFIG_PATH  = _BASE / "config" / "api_keys.json"
_MEMORY_PATH  = _BASE / "memory" / "long_term.json"

def _load_config() -> dict:
    try:
        return json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}

def _platform_os() -> str:
    return {"Windows": "windows", "Darwin": "mac", "Linux": "linux"}.get(
        platform.system(), "linux"
    )

def _get_os() -> str:
    return _load_config().get("os_system", _platform_os()).lower()


def _get_api_key() -> str:
    return _load_config().get("gemini_api_key", "")

_SAFE_SCREENSHOT_ROOTS = (
    Path.home(),
)

def _safe_screenshot_path(requested: str | None) -> Path:
    fallback = Path.home() / "Desktop" / "jarvis_screenshot.png"
    if not requested:
        return fallback
    try:
        p = Path(requested).expanduser().resolve()
        for root in _SAFE_SCREENSHOT_ROOTS:
            if p.is_relative_to(root.resolve()):
                p.parent.mkdir(parents=True, exist_ok=True)
                return p
    except Exception:
        pass
    return fallback

def _require_pyautogui():
    if not _PYAUTOGUI:
        raise RuntimeError("PyAutoGUI not installed. Run: pip install pyautogui")

_FIRST_NAMES = [
    "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Drew", "Quinn",
    "Avery", "Blake", "Cameron", "Dakota", "Emerson", "Finley", "Harper",
]
_LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson",
]
_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "proton.me", "mail.com"]


def _random_data(data_type: str) -> str:
    dt = data_type.lower().strip()

    if dt == "first_name":
        return random.choice(_FIRST_NAMES)

    if dt == "last_name":
        return random.choice(_LAST_NAMES)

    if dt == "name":
        return f"{random.choice(_FIRST_NAMES)} {random.choice(_LAST_NAMES)}"

    if dt == "email":
        first = random.choice(_FIRST_NAMES).lower()
        last  = random.choice(_LAST_NAMES).lower()
        num   = random.randint(10, 999)
        return f"{first}.{last}{num}@{random.choice(_DOMAINS)}"

    if dt == "username":
        return f"{random.choice(_FIRST_NAMES).lower()}{random.randint(100, 9999)}"

    if dt == "password":
        chars = string.ascii_letters + string.digits + "!@#$%"
        raw   = (
            random.choice(string.ascii_uppercase)
            + random.choice(string.digits)
            + random.choice("!@#$%")
            + "".join(random.choices(chars, k=9))
        )
        return "".join(random.sample(raw, len(raw)))

    if dt == "phone":
        return f"+1{random.randint(200,999)}{random.randint(1_000_000, 9_999_999)}"

    if dt == "birthday":
        y = random.randint(1980, 2000)
        m = random.randint(1, 12)
        d = random.randint(1, 28)
        return f"{m:02d}/{d:02d}/{y}"

    if dt == "address":
        num    = random.randint(100, 9999)
        street = random.choice(["Main St", "Oak Ave", "Park Blvd", "Elm St", "Cedar Ln"])
        return f"{num} {street}"

    if dt == "zip_code":
        return str(random.randint(10000, 99999))

    if dt == "city":
        return random.choice(["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"])

    return f"random_{data_type}_{random.randint(1000, 9999)}"

def _user_profile() -> dict:
    """Read identity fields from long-term memory."""
    try:
        if _MEMORY_PATH.exists():
            data     = json.loads(_MEMORY_PATH.read_text(encoding="utf-8"))
            identity = data.get("identity", {})
            return {k: v.get("value", "") for k, v in identity.items()}
    except Exception:
        pass
    return {}

def _type(text: str, interval: float = 0.03) -> str:
    _require_pyautogui()
    time.sleep(0.3)
    pyautogui.typewrite(text, interval=interval)
    return f"Typed: {text[:60]}{'…' if len(text) > 60 else ''}"


def _smart_type(text: str, clear_first: bool = True) -> str:
    _require_pyautogui()
    if clear_first:
        _clear_field()
        time.sleep(0.1)

    if len(text) > 20 and _PYPERCLIP:
        pyperclip.copy(text)
        time.sleep(0.1)
        paste_key = "command" if _get_os() == "mac" else "ctrl"
        pyautogui.hotkey(paste_key, "v")
        return f"Smart-typed (clipboard): {text[:60]}{'…' if len(text) > 60 else ''}"

    pyautogui.typewrite(text, interval=0.04)
    return f"Smart-typed: {text[:60]}{'…' if len(text) > 60 else ''}"


def _click(x=None, y=None, button: str = "left", clicks: int = 1) -> str:
    """Click at (x, y). Coordinates are accepted in ANY of three spaces and
    normalised to real screen pixels before the click — this is what fixes
    clicks landing above/below the target:

      • absolute screen pixels          → clamped only
      • normalised 0-1000 (vision-model space, both axes ≤ 1000) → scaled by
        the *captured pixel* size, not pyautogui.size() (HiDPI mismatch)
      • fractional 0..1                → scaled by captured pixel size
    """
    _require_pyautogui()
    if x is not None and y is not None:
        try:
            fx, fy = float(x), float(y)
        except (TypeError, ValueError):
            return f"Invalid click coordinates: ({x}, {y})"
        scr_w, scr_h = _grab_size()

        if 0.0 <= fx <= 1.0 and 0.0 <= fy <= 1.0 and (fx < 1.0 or fy < 1.0):
            px, py = fx * scr_w, fy * scr_h                          # fractional
        elif fx <= 1000 and fy <= 1000 and max(scr_w, scr_h) > 1000:
            px, py = fx / 1000.0 * scr_w, fy / 1000.0 * scr_h        # norm 0-1000
        else:
            px, py = fx, fy                                          # absolute px

        ix, iy = _clamp_px(px, py, scr_w, scr_h)
        # move first, then click at the settled position: eliminates drift
        # when a duration-based moveTo was used previously
        pyautogui.moveTo(ix, iy, duration=0)
        cx, cy = pyautogui.position()
        pyautogui.click(cx, cy, button=button, clicks=clicks)
        return (f"{'Double-c' if clicks == 2 else 'C'}licked ({cx}, {cy}) "
                f"[{button}] on {scr_w}×{scr_h} screen")
    pyautogui.click(button=button, clicks=clicks)
    return f"Clicked at current position [{button}]"


def _hotkey(*keys) -> str:
    _require_pyautogui()
    pyautogui.hotkey(*keys)
    return f"Hotkey: {'+'.join(keys)}"


def _press(key: str) -> str:
    _require_pyautogui()
    pyautogui.press(key)
    return f"Pressed: {key}"


def _scroll(direction: str = "down", amount: int = 3) -> str:
    _require_pyautogui()
    vertical   = direction in ("up", "down")
    clicks     = amount if direction in ("up", "right") else -amount
    pyautogui.scroll(clicks) if vertical else pyautogui.hscroll(clicks)
    return f"Scrolled {direction} ×{amount}"


def _move(x: int, y: int, duration: float = 0.3) -> str:
    _require_pyautogui()
    pyautogui.moveTo(x, y, duration=duration)
    return f"Mouse → ({x}, {y})"


def _drag(x1: int, y1: int, x2: int, y2: int, duration: float = 0.5) -> str:
    _require_pyautogui()
    pyautogui.moveTo(x1, y1, duration=0.2)
    pyautogui.dragTo(x2, y2, duration=duration, button="left")
    return f"Dragged ({x1},{y1}) → ({x2},{y2})"


def _clipboard_get() -> str:
    if _PYPERCLIP:
        return pyperclip.paste()
    _hotkey("ctrl", "c")
    time.sleep(0.2)
    return "(copied — pyperclip unavailable for read)"


def _clipboard_paste(text: str) -> str:
    if _PYPERCLIP:
        pyperclip.copy(text)
        time.sleep(0.1)
        _require_pyautogui()
        paste_key = "command" if _get_os() == "mac" else "ctrl"
        pyautogui.hotkey(paste_key, "v")
        return f"Pasted: {text[:60]}{'…' if len(text) > 60 else ''}"
    return "pyperclip not available"


def _screenshot(save_path: str | None = None) -> str:
    _require_pyautogui()
    path = _safe_screenshot_path(save_path)
    img  = pyautogui.screenshot()
    img.save(str(path))
    return f"Screenshot saved: {path}"


def _clear_field() -> str:
    _require_pyautogui()
    select_key = "command" if _get_os() == "mac" else "ctrl"
    pyautogui.hotkey(select_key, "a")
    time.sleep(0.1)
    pyautogui.press("delete")
    return "Field cleared"

def _focus_window(title: str) -> str:
    os_name = _get_os()

    if os_name == "windows":
        try:
            script = f'(New-Object -ComObject WScript.Shell).AppActivate("{title}")'
            subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command", script],
                capture_output=True, timeout=5, **_WIN_HIDE,
            )
            time.sleep(0.3)
            return f"Focused window: {title}"
        except Exception as e:
            return f"focus_window (Windows) failed: {e}"

    if os_name == "mac":
        script = (
            f'tell application "System Events" to '
            f'set frontmost of (first process whose name contains "{title}") to true'
        )
        try:
            subprocess.run(
                ["osascript", "-e", script],
                capture_output=True, timeout=5,
            )
            time.sleep(0.3)
            return f"Focused window: {title}"
        except Exception as e:
            return f"focus_window (macOS) failed: {e}"

    if os_name == "linux":
        try:
            result = subprocess.run(
                ["wmctrl", "-a", title],
                capture_output=True, timeout=5,
            )
            if result.returncode == 0:
                time.sleep(0.3)
                return f"Focused window: {title}"
        except FileNotFoundError:
            pass
        try:
            result = subprocess.run(
                ["xdotool", "search", "--name", title, "windowactivate"],
                capture_output=True, timeout=5,
            )
            time.sleep(0.3)
            return f"Focused window: {title}"
        except FileNotFoundError:
            return "focus_window (Linux) requires wmctrl or xdotool"
        except Exception as e:
            return f"focus_window (Linux) failed: {e}"

    return f"focus_window: unknown OS '{os_name}'"

def _screen_grab():
    """Full-resolution screen capture. Returns a PIL image, or None."""
    try:
        from PIL import ImageGrab
        img = ImageGrab.grab(all_screens=True)
        if img is not None:
            return img.convert("RGB")
    except Exception:
        pass
    try:
        _require_pyautogui()
        return pyautogui.screenshot()
    except Exception:
        return None


def _grab_size() -> tuple[int, int]:
    """Pixel size of the actual capture — this is what the model sees and what
    coordinates must be mapped back to. On HiDPI / Retina displays
    pyautogui.size() (logical points) differs from the captured pixel size;
    using it for scaling was the source of clicks landing above/below target."""
    try:
        img = _screen_grab()
        if img is not None:
            return img.size          # (w, h) in real pixels
    except Exception:
        pass
    _require_pyautogui()
    return pyautogui.size()


def _clamp_px(px: float, py: float, scr_w: int, scr_h: int) -> tuple[int, int]:
    return (int(round(min(max(px, 0), scr_w - 1))),
            int(round(min(max(py, 0), scr_h - 1))))


def _to_pixels(x, y) -> tuple[int, int]:
    """Normalise a caller-supplied point (fractional 0..1, normalised 0-1000,
    or absolute pixels) into clamped absolute screen pixels. Denominators are
    the full capture width/height — subtracting 1 would bias every click by up
    to a pixel toward the top-left."""
    try:
        fx, fy = float(x), float(y)
    except (TypeError, ValueError):
        return (0, 0)
    scr_w, scr_h = _grab_size()
    if 0.0 <= fx <= 1.0 and 0.0 <= fy <= 1.0 and (fx < 1.0 or fy < 1.0):
        fx, fy = fx * scr_w, fy * scr_h                      # fractional
    elif fx <= 1000 and fy <= 1000 and max(scr_w, scr_h) > 1000:
        fx, fy = fx / 1000.0 * scr_w, fy / 1000.0 * scr_h    # norm 0-1000
    return _clamp_px(fx, fy, scr_w, scr_h)


def _map_point(px: float, py: float, img_w: int, img_h: int,
               scr_w: int, scr_h: int) -> tuple[int, int]:
    """Map a point given in *image* space to *screen* space. If the vision
    model was fed the full-resolution screenshot (img == screen size) this is
    a plain clamp; if it saw a resized copy the point is scaled back exactly."""
    sx = px * scr_w / float(img_w or scr_w or 1)
    sy = py * scr_h / float(img_h or scr_h or 1)
    return (int(round(min(max(sx, 0), max(scr_w - 1, 0)))),
            int(round(min(max(sy, 0), max(scr_h - 1, 0)))))


def _norm_box_to_screen(box: list, scr_w: int, scr_h: int) -> tuple[int, int]:
    """Convert a normalised [0-1000] box [x1,y1,x2,y2] (Gemini convention) to
    the centre point in absolute screen pixels. Uses the full width/height as
    denominator — subtracting 1 here shifts every click slightly up-left."""
    x1, y1, x2, y2 = box
    cx = (min(x1, x2) + max(x1, x2)) / 2.0
    cy = (min(y1, y2) + max(y1, y2)) / 2.0
    px = cx / 1000.0 * scr_w
    py = cy / 1000.0 * scr_h
    return (int(round(min(max(px, 0), scr_w - 1))),
            int(round(min(max(py, 0), scr_h - 1))))


def _abs_box_to_screen(box: list, img_w: int, img_h: int,
                       scr_w: int, scr_h: int) -> tuple[int, int]:
    """Convert an absolute-pixel box [x1,y1,x2,y2] measured on a screenshot of
    size (img_w,img_h) to the centre point on a screen of size (scr_w,scr_h)."""
    x1, y1, x2, y2 = box
    cx = (min(x1, x2) + max(x1, x2)) / 2.0
    cy = (min(y1, y2) + max(y1, y2)) / 2.0
    return _map_point(cx, cy, img_w, img_h, scr_w, scr_h)


def _parse_box(text: str):
    """Return ([x1,y1,x2,y2], coord_space) where coord_space is 'norm' (0-1000)
    or 'abs' (pixels). Accepts Gemini's box output formats and plain x,y.

    Disambiguation rule: a 4-tuple whose max value is <= 1000 is treated as
    normalised ONLY when the screen is wider/taller than 1000 px (otherwise an
    absolute pixel box on a small screen could be mistaken for norm coords).
    A bare x,y point is interpreted in image-pixel space by the caller, which
    knows the exact size of the image that was sent to the model."""
    t = text or ""
    m = re.search(r"\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]", t)
    if m:
        box = [int(m.group(i)) for i in range(1, 5)]
        space = "norm" if max(box) <= 1000 else "abs"
        return box, space
    m = re.search(r"\bcoordinates?\b[^0-9]*?(\d+)\s*[,x]\s*(\d+)", t, re.I)
    if not m:
        m = re.search(r"^\s*(\d+)\s*,\s*(\d+)\s*$", t.strip())
    if m:
        x, y = int(m.group(1)), int(m.group(2))
        return [x, y, x, y], "abs"     # caller maps against sent-image size
    return None, ""


def _vision_find(prompt_fn, description: str):
    """Shared vision-element finder. The screenshot is sent at FULL native
    resolution and the model is asked for a normalised 0-1000 bounding box of
    the clickable element; the box centre is then mapped to absolute screen
    pixels with exact scale factors (never against pyautogui.size(), which on
    HiDPI displays differs from the captured pixel grid).
    Returns (x, y) in absolute screen pixels, or None."""
    grab = _screen_grab()
    if grab is None:
        return None
    scr_w, scr_h = grab.size                    # real pixel geometry

    def _to_screen(raw: str):
        box, space = _parse_box(raw)
        if box is None:
            return None
        if space == "norm":
            return _norm_box_to_screen(box, scr_w, scr_h)
        # absolute pixels — image we sent was full-res, so map 1:1 w/ clamp
        return _abs_box_to_screen(box, scr_w, scr_h, scr_w, scr_h)

    prompt = prompt_fn()

    # ── preferred path: unified router (honours user's custom API config) ───
    try:
        sys.path.insert(0, str(_BASE))
        from core import api_router
        prov = api_router.active_provider()
    except Exception:
        prov = None
    if prov is not None and prov.get("kind") != "ollama":
        try:
            buf = io.BytesIO()
            grab.save(buf, format="JPEG", quality=92)
            import base64 as _b64
            b64 = _b64.b64encode(buf.getvalue()).decode()
            messages = [{
                "role": "user",
                "content": [
                    {"type": "image_url",
                     "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                    {"type": "text", "text": prompt},
                ],
            }]
            headers = {"Content-Type": "application/json"}
            if prov.get("api_key"):
                headers["Authorization"] = f"Bearer {prov['api_key']}"
            r = requests.post(f"{prov['base_url']}/v1/chat/completions",
                              json={"model": prov["selected_model"],
                                    "messages": messages, "stream": False,
                                    "temperature": 0.0, "max_tokens": 300},
                              headers=headers, timeout=45)
            r.raise_for_status()
            content = ((r.json().get("choices") or [{}])[0]
                       .get("message") or {}).get("content") or ""
            if "NOT_FOUND" not in content.upper():
                pt = _to_screen(content)
                if pt:
                    return pt
        except Exception as e:
            print(f"[ComputerControl] ⚠️ vision via custom provider failed: {e}")

    # ── fallback: Gemini ladder ──────────────────────────────────────────────
    try:
        from google.genai import types as gtypes
        from core import gemini
        buf = io.BytesIO()
        grab.save(buf, format="PNG")
        response = gemini.call(
            [gtypes.Part.from_bytes(data=buf.getvalue(), mime_type="image/png"),
             prompt],
            tier=gemini.FAST, timeout_ms=20_000,
        )
        if response is not None:
            text = (response.text or "").strip()
            if "NOT_FOUND" not in text.upper():
                return _to_screen(text)
    except Exception as e:
        print(f"[ComputerControl] ⚠️ screen_find failed: {e}")

    return None


_FIND_PROMPT_TMPL = (
    "You are a precise UI element locator. The attached image is a full computer "
    "screenshot of size {w}×{h} pixels. Find the UI element described below and "
    "report its EXACT clickable bounding box.\n"
    "Element: '{desc}'\n"
    "Rules:\n"
    "- Report the tightest box that fully contains the clickable element "
    "(including its label/padding), NOT just the text glyphs.\n"
    "- Coordinates MUST be normalised to a 0-1000 scale relative to the image: "
    "x_norm = round(x_pixel / {w} * 1000), y_norm = round(y_pixel / {h} * 1000).\n"
    "- Reply with ONLY this format: [x1,y1,x2,y2]\n"
    "- If several candidates match, pick the most prominent/clickable one.\n"
    "- If the element is not visible, reply: NOT_FOUND"
)


def _screen_find(description: str) -> tuple[int, int] | None:
    def prompt_for():
        w, h = _grab_size()
        return _FIND_PROMPT_TMPL.format(w=w, h=h, desc=description)
    return _vision_find(prompt_for, description)

def computer_control(
    parameters: dict,
    response=None,
    player=None,
    session_memory=None,
) -> str:
    """
    Dispatch table for all computer control actions.

    parameters keys (all optional unless noted):
      action        : (required) one of the actions listed below
      text          : text to type or paste
      x, y          : screen coordinates
      button        : 'left' | 'right' (default: left)
      keys          : hotkey string, e.g. 'ctrl+c'
      key           : single key name, e.g. 'enter'
      direction     : 'up' | 'down' | 'left' | 'right'
      amount        : scroll amount (default: 3)
      seconds       : wait duration
      title         : window title fragment for focus_window
      description   : natural-language element description for screen_find/click
      type          : data type for random_data
      field         : memory field name for user_data
      clear_first   : bool, clear field before typing (default: true)
      path          : save path for screenshot (must be inside home dir)

    Actions:
      type          — type text at cursor
      smart_type    — clear field + type (clipboard-backed)
      click         — left click
      double_click  — double left click
      right_click   — right click
      move          — move mouse
      drag          — click-drag between two points
      hotkey        — key combination
      press         — single key
      scroll        — scroll the wheel
      copy          — read clipboard
      paste         — write + paste clipboard
      screenshot    — capture screen (safe path only)
      wait          — sleep N seconds
      clear_field   — select-all + delete
      focus_window  — bring window to foreground
      screen_find   — AI element finder (returns x,y)
      screen_click  — AI element finder + click

    Coordinate contract for click/double_click/right_click/move/drag:
      The vision layer reports positions as a normalised 0-1000 bounding box;
      _screen_find already converts that to exact absolute pixels. When the
      model passes x/y directly, any of these spaces is accepted and mapped
      onto the *captured* pixel grid (HiDPI-safe): absolute pixels, or
      normalised 0-1000 values when both axes are ≤ 1000 on screens larger
      than 1000 px. Prefer screen_click with a description over raw
      coordinates whenever possible — it is far more accurate.
      random_data   — generate fake form data
      user_data     — pull real data from memory
    """
    params = parameters or {}
    action = params.get("action", "").lower().strip()

    if not action:
        return "No action specified for computer_control."

    if player:
        player.write_log(f"[Computer] {action}")

    print(f"[ComputerControl] ▶ {action}  {params}")

    try:

        if action == "type":
            return _type(params.get("text", ""))

        if action == "smart_type":
            return _smart_type(
                params.get("text", ""),
                clear_first=params.get("clear_first", True),
            )

        if action in ("click", "left_click"):
            return _click(params.get("x"), params.get("y"), "left", 1)

        if action == "double_click":
            return _click(params.get("x"), params.get("y"), "left", 2)

        if action == "right_click":
            return _click(params.get("x"), params.get("y"), "right", 1)

        if action == "move":
            return _move(*_to_pixels(params.get("x", 0), params.get("y", 0)))

        if action == "drag":
            x1, y1 = _to_pixels(params.get("x1", 0), params.get("y1", 0))
            x2, y2 = _to_pixels(params.get("x2", 0), params.get("y2", 0))
            return _drag(x1, y1, x2, y2)

        if action == "hotkey":
            raw  = params.get("keys", "")
            keys = [k.strip() for k in raw.split("+")] if isinstance(raw, str) else raw
            return _hotkey(*keys)

        if action == "press":
            return _press(params.get("key", "enter"))

        if action == "scroll":
            return _scroll(
                direction=params.get("direction", "down"),
                amount=int(params.get("amount", 3)),
            )

        if action == "copy":
            return _clipboard_get()

        if action == "paste":
            return _clipboard_paste(params.get("text", ""))

        if action == "screenshot":
            return _screenshot(params.get("path"))

        if action == "screen_find":
            coords = _screen_find(params.get("description", ""))
            return f"{coords[0]},{coords[1]}" if coords else "NOT_FOUND"

        if action == "screen_click":
            desc   = params.get("description", "")
            coords = _screen_find(desc)
            if coords:
                time.sleep(0.2)
                _click(x=coords[0], y=coords[1])
                return f"Clicked '{desc}' at {coords}"
            return f"Element not found on screen: '{desc}'"

        if action == "wait":
            secs = float(params.get("seconds", 1.0))
            secs = min(secs, 30.0)
            time.sleep(secs)
            return f"Waited {secs}s"

        if action == "clear_field":
            return _clear_field()

        if action == "focus_window":
            return _focus_window(params.get("title", ""))

        if action == "random_data":
            dt     = params.get("type", "name")
            result = _random_data(dt)
            print(f"[ComputerControl] 🎲 random {dt} → {result}")
            return result

        if action == "user_data":
            field   = params.get("field", "name")
            profile = _user_profile()
            value   = profile.get(field, "")
            if not value:
                value = _random_data(field)
                print(f"[ComputerControl] ⚠️ No '{field}' in memory, using random: {value}")
            return value

        return f"Unknown action: '{action}'"

    except Exception as e:
        print(f"[ComputerControl] ❌ {action}: {e}")
        return f"computer_control '{action}' failed: {e}"


# ── Tool declaration (auto-discovered by core/action_loader.py) ──────────────
TOOL = {
    "name": "computer_control",
    "description": "Direct computer control: type, click, hotkeys, scroll, move mouse, screenshots, find elements on screen.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "action": {
                "type": "STRING",
                "description": "type | smart_type | click | double_click | right_click | hotkey | press | scroll | move | copy | paste | screenshot | wait | clear_field | focus_window | screen_find | screen_click | random_data | user_data"
            },
            "text": {
                "type": "STRING",
                "description": "Text to type or paste"
            },
            "x": {
                "type": "INTEGER",
                "description": "X coordinate"
            },
            "y": {
                "type": "INTEGER",
                "description": "Y coordinate"
            },
            "keys": {
                "type": "STRING",
                "description": "Key combination e.g. 'ctrl+c'"
            },
            "key": {
                "type": "STRING",
                "description": "Single key e.g. 'enter'"
            },
            "direction": {
                "type": "STRING",
                "description": "up | down | left | right"
            },
            "amount": {
                "type": "INTEGER",
                "description": "Scroll amount (default: 3)"
            },
            "seconds": {
                "type": "NUMBER",
                "description": "Seconds to wait"
            },
            "title": {
                "type": "STRING",
                "description": "Window title for focus_window"
            },
            "description": {
                "type": "STRING",
                "description": "Element description for screen_find/screen_click"
            },
            "type": {
                "type": "STRING",
                "description": "Data type for random_data"
            },
            "field": {
                "type": "STRING",
                "description": "Field for user_data: name|email|city"
            },
            "clear_first": {
                "type": "BOOLEAN",
                "description": "Clear field before typing (default: true)"
            },
            "path": {
                "type": "STRING",
                "description": "Save path for screenshot"
            }
        },
        "required": [
            "action"
        ]
    },
    "handler": computer_control,
}
