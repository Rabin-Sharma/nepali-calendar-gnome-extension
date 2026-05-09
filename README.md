# Nepali Calendar GNOME Extension

Professional Bikram Sambat (BS) calendar extension for GNOME Shell 46.

## Features
- BS date in top panel (center, beside default clock)
- Beautiful monthly popup calendar
- Month and year jump controls
- Today quick jump button
- Bigger modal and bigger day cells
- Optional Gregorian day hints
- Preferences for date format and colors

## Requirements
- GNOME Shell 46 (also compatible with 45 per metadata)
- Extension folder UUID: `nepali-calendar@rabin-sharma`

## Install / Update
Place this directory at:

`~/.local/share/gnome-shell/extensions/nepali-calendar@rabin-sharma`

If you changed schema XML during local testing, you may compile schemas:

```bash
cd ~/.local/share/gnome-shell/extensions/nepali-calendar@rabin-sharma
glib-compile-schemas schemas
```

For GNOME 45+ publishing, do **not** ship `schemas/gschemas.compiled` in the zip.

Enable extension:

```bash
gnome-extensions enable nepali-calendar@rabin-sharma
```

## Reload During Development
```bash
gnome-extensions disable nepali-calendar@rabin-sharma
gnome-extensions enable nepali-calendar@rabin-sharma
```

## Open Preferences
```bash
gnome-extensions prefs nepali-calendar@rabin-sharma
```

## Troubleshooting
Check shell logs:

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

Check prefs logs:

```bash
journalctl -f -o cat /usr/bin/gjs
```

## Notes
- Run `glib-compile-schemas schemas` only when schema XML changes.
