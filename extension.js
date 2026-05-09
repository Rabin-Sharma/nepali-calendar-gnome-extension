import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

// Conversion constants adapted from medic/bikram-sambat (Apache-2.0).
const MS_PER_DAY = 86400000;
const BS_EPOCH_TS = -1789990200000; // 1913-04-13 AD == 1970-01-01 BS
const BS_YEAR_ZERO = 1970;
const ENCODED_MONTH_LENGTHS = [
    5315258, 5314490, 9459438, 8673005, 5315258, 5315066, 9459438, 8673005,
    5315258, 5314298, 9459438, 5327594, 5315258, 5314298, 9459438, 5327594,
    5315258, 5314286, 9459438, 5315306, 5315258, 5314286, 8673006, 5315306,
    5315258, 5265134, 8673006, 5315258, 5315258, 9459438, 8673005, 5315258,
    5314298, 9459438, 8673005, 5315258, 5314298, 9459438, 8473322, 5315258,
    5314298, 9459438, 5327594, 5315258, 5314298, 9459438, 5327594, 5315258,
    5314286, 8673006, 5315306, 5315258, 5265134, 8673006, 5315306, 5315258,
    9459438, 8673005, 5315258, 5314490, 9459438, 8673005, 5315258, 5314298,
    9459438, 8473325, 5315258, 5314298, 9459438, 5327594, 5315258, 5314298,
    9459438, 5327594, 5315258, 5314286, 9459438, 5315306, 5315258, 5265134,
    8673006, 5315306, 5315258, 5265134, 8673006, 5315258, 5314490, 9459438,
    8673005, 5315258, 5314298, 9459438, 8669933, 5315258, 5314298, 9459438,
    8473322, 5315258, 5314298, 9459438, 5327594, 5315258, 5314286, 9459438,
    5315306, 5315258, 5265134, 8673006, 5315306, 5315258, 5265134, 8673006,
    5315258, 5527226, 5527226, 5528046, 5527277, 5528250, 5528057, 5527277,
    5527277,
];

const BS_MONTHS_NE = ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'];
const BS_MONTHS_EN = ['Baishakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashoj', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_NE = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिहि', 'शुक्र', 'शनि'];
const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

const SETTINGS_KEYS = {
    dateFormat: 'date-format',
    useNepaliDigits: 'use-nepali-digits',
    accentColor: 'accent-color',
    todayBorderColor: 'today-border-color',
    todayFillColor: 'today-fill-color',
    todayTextColor: 'today-text-color',
    todayHighlightStyle: 'today-highlight-style',
    panelTextColor: 'panel-text-color',
    popupBackground: 'popup-background',
    showGregorianHints: 'show-gregorian-hints',
};

function daysInBsMonth(year, month) {
    if (month < 1 || month > 12)
        throw new Error(`Invalid BS month: ${month}`);

    const delta = ENCODED_MONTH_LENGTHS[year - BS_YEAR_ZERO];
    if (typeof delta === 'undefined')
        throw new Error(`No BS data for year ${year}`);

    return 29 + ((delta >>> ((month - 1) << 1)) & 3);
}

function bsFromGregorianString(greg) {
    let year = BS_YEAR_ZERO;
    let days = Math.floor((Date.parse(greg) - BS_EPOCH_TS) / MS_PER_DAY) + 1;

    while (days > 0) {
        for (let month = 1; month <= 12; month++) {
            const monthDays = daysInBsMonth(year, month);
            if (days <= monthDays)
                return {year, month, day: days};
            days -= monthDays;
        }
        year++;
    }

    throw new Error(`Date outside supported range: ${greg}`);
}

function bsFromDate(date) {
    const greg = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    return bsFromGregorianString(greg);
}

function gregorianFromBs(year, month, day) {
    if (month < 1 || month > 12)
        throw new Error(`Invalid BS month: ${month}`);
    if (year < BS_YEAR_ZERO)
        throw new Error(`Invalid BS year: ${year}`);
    if (day < 1 || day > daysInBsMonth(year, month))
        throw new Error(`Invalid BS day: ${day}`);

    let timestamp = BS_EPOCH_TS + (MS_PER_DAY * day);
    month--;

    while (year >= BS_YEAR_ZERO) {
        while (month > 0) {
            timestamp += (MS_PER_DAY * daysInBsMonth(year, month));
            month--;
        }
        month = 12;
        year--;
    }

    const date = new Date(timestamp);
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
    };
}

function sanitizeColor(input, fallback) {
    if (typeof input !== 'string')
        return fallback;

    const color = input.trim();
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color))
        return color;

    return fallback;
}

function toLocalizedNumber(value, useNepaliDigits, pad = 0) {
    const text = value.toString().padStart(pad, '0');
    if (!useNepaliDigits)
        return text;

    return text.replace(/[0-9]/g, d => DEVANAGARI_DIGITS[Number(d)]);
}

function sanitizeTodayHighlightStyle(input) {
    const value = typeof input === 'string' ? input.trim() : '';
    return ['border', 'fill', 'both'].includes(value) ? value : 'border';
}

class NepaliCalendarIndicator extends PanelMenu.Button {
    static {
        GObject.registerClass(this);
    }

    constructor(extension) {
        super(0.0, 'NepaliCalendarIndicator');

        this._extension = extension;
        this._settings = extension.getSettings();

        this._refreshTimerId = null;
        this._settingsSignals = [];

        this._todayBs = bsFromDate(new Date());
        this._viewYear = this._todayBs.year;
        this._viewMonth = this._todayBs.month;

        this._panelLabel = new St.Label({
            style_class: 'nepcal-panel-label',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.add_child(this._panelLabel);

        this._menuRootItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            style_class: 'nepcal-menu-item',
        });

        this._menuRoot = new St.BoxLayout({
            vertical: true,
            style_class: 'nepcal-menu-root',
            x_expand: true,
        });

        this._menuRootItem.add_child(this._menuRoot);
        this.menu.addMenuItem(this._menuRootItem);

        this.menu.connect('open-state-changed', (_menu, isOpen) => {
            if (isOpen)
                this._renderCalendar();
        });

        this._settingsSignals.push(this._settings.connect(`changed::${SETTINGS_KEYS.dateFormat}`, () => this._syncVisuals()));
        this._settingsSignals.push(this._settings.connect(`changed::${SETTINGS_KEYS.useNepaliDigits}`, () => this._syncVisuals()));
        this._settingsSignals.push(this._settings.connect(`changed::${SETTINGS_KEYS.accentColor}`, () => this._syncVisuals()));
        this._settingsSignals.push(this._settings.connect(`changed::${SETTINGS_KEYS.todayBorderColor}`, () => this._syncVisuals()));
        this._settingsSignals.push(this._settings.connect(`changed::${SETTINGS_KEYS.todayFillColor}`, () => this._syncVisuals()));
        this._settingsSignals.push(this._settings.connect(`changed::${SETTINGS_KEYS.todayTextColor}`, () => this._syncVisuals()));
        this._settingsSignals.push(this._settings.connect(`changed::${SETTINGS_KEYS.todayHighlightStyle}`, () => this._syncVisuals()));
        this._settingsSignals.push(this._settings.connect(`changed::${SETTINGS_KEYS.panelTextColor}`, () => this._syncVisuals()));
        this._settingsSignals.push(this._settings.connect(`changed::${SETTINGS_KEYS.popupBackground}`, () => this._syncVisuals()));
        this._settingsSignals.push(this._settings.connect(`changed::${SETTINGS_KEYS.showGregorianHints}`, () => this._syncVisuals()));

        this._syncVisuals();
        this._startTimer();
    }

    _startTimer() {
        this._refreshTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => {
            this._refreshToday();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _refreshToday() {
        this._todayBs = bsFromDate(new Date());
        this._updatePanelLabel();

        if (this.menu.isOpen)
            this._renderCalendar();
    }

    _syncVisuals() {
        const panelTextColor = sanitizeColor(this._settings.get_string(SETTINGS_KEYS.panelTextColor), '#f8fafc');
        this._panelLabel.style = `color: ${panelTextColor};`;

        this._updatePanelLabel();
        if (this.menu.isOpen)
            this._renderCalendar();
    }

    _updatePanelLabel() {
        const useNepaliDigits = this._settings.get_boolean(SETTINGS_KEYS.useNepaliDigits);
        const format = this._settings.get_string(SETTINGS_KEYS.dateFormat);

        const day = toLocalizedNumber(this._todayBs.day, useNepaliDigits);
        const month = useNepaliDigits ? BS_MONTHS_NE[this._todayBs.month - 1] : BS_MONTHS_EN[this._todayBs.month - 1];
        const year = toLocalizedNumber(this._todayBs.year, useNepaliDigits);

        let text;
        switch (format) {
        case 'numeric':
            text = `${toLocalizedNumber(this._todayBs.year, useNepaliDigits)}-${toLocalizedNumber(this._todayBs.month, useNepaliDigits, 2)}-${toLocalizedNumber(this._todayBs.day, useNepaliDigits, 2)} BS`;
            break;
        case 'compact':
            text = `${day} ${month}`;
            break;
        case 'long':
        default:
            text = `${day} ${month} ${year}`;
            break;
        }

        this._panelLabel.text = text;
    }

    _changeMonth(delta) {
        let year = this._viewYear;
        let month = this._viewMonth + delta;

        while (month < 1) {
            month += 12;
            year -= 1;
        }

        while (month > 12) {
            month -= 12;
            year += 1;
        }

        const minYear = BS_YEAR_ZERO;
        const maxYear = BS_YEAR_ZERO + ENCODED_MONTH_LENGTHS.length - 1;
        if (year < minYear || year > maxYear)
            return;

        this._viewYear = year;
        this._viewMonth = month;
        this._renderCalendar();
    }

    _setView(year, month) {
        if (month < 1 || month > 12)
            return;

        const minYear = BS_YEAR_ZERO;
        const maxYear = BS_YEAR_ZERO + ENCODED_MONTH_LENGTHS.length - 1;
        if (year < minYear || year > maxYear)
            return;

        this._viewYear = year;
        this._viewMonth = month;
        this._renderCalendar();
    }

    _changeYear(delta) {
        this._setView(this._viewYear + delta, this._viewMonth);
    }

    _jumpToToday() {
        this._viewYear = this._todayBs.year;
        this._viewMonth = this._todayBs.month;
        this._renderCalendar();
    }

    _clearMenuRoot() {
        for (const child of this._menuRoot.get_children())
            child.destroy();
    }

    _renderCalendar() {
        try {
            this._clearMenuRoot();

            const useNepaliDigits = this._settings.get_boolean(SETTINGS_KEYS.useNepaliDigits);
            const showGregorianHints = this._settings.get_boolean(SETTINGS_KEYS.showGregorianHints);
            const accent = sanitizeColor(this._settings.get_string(SETTINGS_KEYS.accentColor), '#3b82f6');
            const todayBorderColor = sanitizeColor(this._settings.get_string(SETTINGS_KEYS.todayBorderColor), accent);
            const todayFillColor = sanitizeColor(this._settings.get_string(SETTINGS_KEYS.todayFillColor), '#1d4ed8');
            const todayTextColor = sanitizeColor(this._settings.get_string(SETTINGS_KEYS.todayTextColor), '#f8fafc');
            const todayHighlightStyle = sanitizeTodayHighlightStyle(this._settings.get_string(SETTINGS_KEYS.todayHighlightStyle));
            const popupBackground = sanitizeColor(this._settings.get_string(SETTINGS_KEYS.popupBackground), '#111827');

            this._menuRoot.style = `background: ${popupBackground}; border-radius: 20px; padding: 18px; min-width: 560px;`;

            const header = new St.BoxLayout({
                style_class: 'nepcal-header',
                x_expand: true,
            });

            const prevButton = new St.Button({
                style_class: 'nepcal-nav-button',
                child: new St.Icon({icon_name: 'go-previous-symbolic'}),
            });
            prevButton.connect('clicked', () => this._changeMonth(-1));

            const title = new St.Label({
                style_class: 'nepcal-title',
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.CENTER,
            });
            title.style = `color: ${accent};`;

            const monthName = useNepaliDigits ? BS_MONTHS_NE[this._viewMonth - 1] : BS_MONTHS_EN[this._viewMonth - 1];
            const yearText = toLocalizedNumber(this._viewYear, useNepaliDigits);
            title.text = `${monthName} ${yearText}`;

            const nextButton = new St.Button({
                style_class: 'nepcal-nav-button',
                child: new St.Icon({icon_name: 'go-next-symbolic'}),
            });
            nextButton.connect('clicked', () => this._changeMonth(1));

            const minYear = BS_YEAR_ZERO;
            const maxYear = BS_YEAR_ZERO + ENCODED_MONTH_LENGTHS.length - 1;
            if (this._viewYear === minYear && this._viewMonth === 1)
                prevButton.reactive = false;
            if (this._viewYear === maxYear && this._viewMonth === 12)
                nextButton.reactive = false;

            header.add_child(prevButton);
            header.add_child(title);
            header.add_child(nextButton);
            this._menuRoot.add_child(header);

            const jumpRow = new St.BoxLayout({
                style_class: 'nepcal-jump-row',
                x_expand: true,
            });

            const yearPicker = new St.BoxLayout({
                style_class: 'nepcal-jump-picker',
                x_expand: true,
            });
            const yearDecButton = new St.Button({
                style_class: 'nepcal-jump-button',
                child: new St.Label({text: '-'}),
            });
            yearDecButton.connect('clicked', () => this._changeYear(-1));
            const yearLabel = new St.Label({
                text: useNepaliDigits
                    ? `साल ${toLocalizedNumber(this._viewYear, true)}`
                    : `Year ${toLocalizedNumber(this._viewYear, false)}`,
                style_class: 'nepcal-jump-label',
                x_expand: true,
                x_align: Clutter.ActorAlign.CENTER,
            });
            const yearIncButton = new St.Button({
                style_class: 'nepcal-jump-button',
                child: new St.Label({text: '+'}),
            });
            yearIncButton.connect('clicked', () => this._changeYear(1));
            yearPicker.add_child(yearDecButton);
            yearPicker.add_child(yearLabel);
            yearPicker.add_child(yearIncButton);
            if (this._viewYear <= minYear)
                yearDecButton.reactive = false;
            if (this._viewYear >= maxYear)
                yearIncButton.reactive = false;

            const monthPicker = new St.BoxLayout({
                style_class: 'nepcal-jump-picker',
                x_expand: true,
            });
            const monthDecButton = new St.Button({
                style_class: 'nepcal-jump-button',
                child: new St.Label({text: '-'}),
            });
            monthDecButton.connect('clicked', () => this._changeMonth(-1));
            const monthLabel = new St.Label({
                text: useNepaliDigits ? BS_MONTHS_NE[this._viewMonth - 1] : BS_MONTHS_EN[this._viewMonth - 1],
                style_class: 'nepcal-jump-label',
                x_expand: true,
                x_align: Clutter.ActorAlign.CENTER,
            });
            const monthIncButton = new St.Button({
                style_class: 'nepcal-jump-button',
                child: new St.Label({text: '+'}),
            });
            monthIncButton.connect('clicked', () => this._changeMonth(1));
            monthPicker.add_child(monthDecButton);
            monthPicker.add_child(monthLabel);
            monthPicker.add_child(monthIncButton);

            const todayButton = new St.Button({
                style_class: 'nepcal-today-button',
                label: useNepaliDigits ? 'आज' : 'Today',
            });
            todayButton.connect('clicked', () => this._jumpToToday());

            jumpRow.add_child(yearPicker);
            jumpRow.add_child(monthPicker);
            jumpRow.add_child(todayButton);
            this._menuRoot.add_child(jumpRow);

            const weekHeader = new St.BoxLayout({
                style_class: 'nepcal-week-header',
                x_expand: true,
            });

            const weekdays = useNepaliDigits ? WEEKDAYS_NE : WEEKDAYS_EN;
            for (let i = 0; i < weekdays.length; i++) {
                const label = new St.Label({
                    text: weekdays[i],
                    style_class: 'nepcal-weekday-label',
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                });

                if (i === 6)
                    label.add_style_class_name('nepcal-saturday');

                weekHeader.add_child(label);
            }
            this._menuRoot.add_child(weekHeader);

            const monthDays = daysInBsMonth(this._viewYear, this._viewMonth);
            const firstDayGreg = gregorianFromBs(this._viewYear, this._viewMonth, 1);
            const firstDay = new Date(firstDayGreg.year, firstDayGreg.month - 1, firstDayGreg.day).getDay();

            const grid = new St.Widget({
                layout_manager: new Clutter.GridLayout({
                    orientation: Clutter.Orientation.VERTICAL,
                    column_homogeneous: true,
                    row_homogeneous: true,
                }),
                style_class: 'nepcal-grid',
                x_expand: true,
            });

            const gridLayout = grid.layout_manager;
            let day = 1;

            for (let row = 0; row < 6; row++) {
                for (let col = 0; col < 7; col++) {
                    const cellIndex = row * 7 + col;
                    const inMonth = cellIndex >= firstDay && day <= monthDays;

                    if (!inMonth) {
                        const placeholder = new St.Label({text: ' '});
                        gridLayout.attach(placeholder, col, row, 1, 1);
                        continue;
                    }

                    const button = new St.Button({
                        style_class: 'nepcal-day-cell',
                        reactive: false,
                    });

                    const content = new St.BoxLayout({
                        vertical: true,
                        x_align: Clutter.ActorAlign.CENTER,
                        y_align: Clutter.ActorAlign.CENTER,
                    });

                    const bsLabel = new St.Label({
                        text: toLocalizedNumber(day, useNepaliDigits),
                        style_class: 'nepcal-bs-day',
                        x_align: Clutter.ActorAlign.CENTER,
                    });

                    content.add_child(bsLabel);

                    const gDate = gregorianFromBs(this._viewYear, this._viewMonth, day);

                    if (showGregorianHints) {
                        const adLabel = new St.Label({
                            text: toLocalizedNumber(gDate.day, useNepaliDigits),
                            style_class: 'nepcal-ad-day',
                            x_align: Clutter.ActorAlign.CENTER,
                        });
                        content.add_child(adLabel);
                    }

                    button.set_child(content);

                    if (this._viewYear === this._todayBs.year &&
                        this._viewMonth === this._todayBs.month &&
                        day === this._todayBs.day) {
                        button.add_style_class_name('nepcal-day-today');
                        if (todayHighlightStyle === 'fill') {
                            button.style = `border: 1px solid ${todayFillColor}; background: ${todayFillColor}; color: ${todayTextColor};`;
                        } else if (todayHighlightStyle === 'both') {
                            button.style = `border: 2px solid ${todayBorderColor}; background: ${todayFillColor}; color: ${todayTextColor};`;
                        } else {
                            button.style = `border: 2px solid ${todayBorderColor}; background: rgba(0, 0, 0, 0.0); color: ${todayTextColor};`;
                        }
                    }

                    if (col === 6)
                        button.add_style_class_name('nepcal-saturday-cell');

                    gridLayout.attach(button, col, row, 1, 1);
                    day++;
                }
            }

            this._menuRoot.add_child(grid);

            const todayRow = new St.Label({
                style_class: 'nepcal-today-summary',
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
            });

            const todayMonth = useNepaliDigits ? BS_MONTHS_NE[this._todayBs.month - 1] : BS_MONTHS_EN[this._todayBs.month - 1];
            todayRow.text = `Today: ${toLocalizedNumber(this._todayBs.day, useNepaliDigits)} ${todayMonth} ${toLocalizedNumber(this._todayBs.year, useNepaliDigits)} BS`;
            this._menuRoot.add_child(todayRow);
        } catch (error) {
            logError(error, 'Nepali Calendar popup render failed');
        }
    }

    destroy() {
        if (this._refreshTimerId) {
            GLib.source_remove(this._refreshTimerId);
            this._refreshTimerId = null;
        }

        for (const id of this._settingsSignals)
            this._settings.disconnect(id);
        this._settingsSignals = [];

        super.destroy();
    }
}

export default class NepaliCalendarExtension extends Extension {
    enable() {
        try {
            this._indicator = new NepaliCalendarIndicator(this);
            Main.panel.addToStatusArea('nepali-calendar', this._indicator, 0, 'center');
        } catch (error) {
            logError(error, 'Nepali Calendar failed to enable');
        }
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
