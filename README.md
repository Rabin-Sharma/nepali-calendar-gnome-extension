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
- Extension folder UUID: `nepali-calendar@rabin`

## Install / Update
Place this directory at:

`~/.local/share/gnome-shell/extensions/nepali-calendar@rabin`

If you changed schema XML, compile schemas:

```bash
cd ~/.local/share/gnome-shell/extensions/nepali-calendar@rabin
glib-compile-schemas schemas
```

Enable extension:

```bash
gnome-extensions enable nepali-calendar@rabin
```

## Reload During Development
```bash
gnome-extensions disable nepali-calendar@rabin
gnome-extensions enable nepali-calendar@rabin
```

## Open Preferences
```bash
gnome-extensions prefs nepali-calendar@rabin
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
