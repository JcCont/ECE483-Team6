# Hydrometrics Heart Coach

Demo 1 app for the Hydrometrics heart-rate biosensor.

## Files

| File | What it does |
|---|---|
| `index.html` | Page structure: Home, Workouts, Progress, Settings, setup questions |
| `styles.css` | Colors, fonts, layout, mascot animations, background scenes |
| `app.js` | App logic: heart-rate readings, mascot messages, workout suggestions, Bluetooth |
| `images/` | The four mascot poses (normal, jump, thumbs up, wink and wave) |
| `raspberry-pi/uplift_hr_pi.py` | Runs on the Pi Zero 2 W and sends heart rate over Bluetooth |

## Run it

1. Open this folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` → **Open with Live Server**.
4. Use **Chrome** or **Edge** if you want to connect the Raspberry Pi over Bluetooth.

## Quick edits

- Main colors: `--calm` (blue) and `--accent` (green) at the top of `styles.css`
- What the mascot says: search `const lines`, `const longLines`, and `const tapLines` in `app.js`
- Workout suggestion rules: search `function baseSuggest` in `app.js`
- Mascot images: replace the files in `images/` (keep the same names and canvas size)
