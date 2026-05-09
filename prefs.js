import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

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

const DATE_FORMATS = [
    ['long', 'Long (27 Baishakh 2083)'],
    ['compact', 'Compact (27 Baishakh)'],
    ['numeric', 'Numeric (2083-01-27 BS)'],
];

const TODAY_HIGHLIGHT_STYLES = [
    ['border', 'Border Only'],
    ['fill', 'Fill Only'],
    ['both', 'Border and Fill'],
];

export default class NepaliCalendarPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'Nepali Calendar',
            icon_name: 'x-office-calendar-symbolic',
        });
        window.add(page);

        const formatGroup = new Adw.PreferencesGroup({
            title: 'Date and Language',
            description: 'Customize BS date format shown in the top panel and popup.',
        });
        page.add(formatGroup);

        const formatRow = new Adw.ActionRow({
            title: 'Panel Date Format',
        });

        const model = Gtk.StringList.new(DATE_FORMATS.map(([, label]) => label));
        const formatDropdown = new Gtk.DropDown({model});
        formatDropdown.valign = Gtk.Align.CENTER;

        const currentFormat = settings.get_string(SETTINGS_KEYS.dateFormat);
        const initialIndex = Math.max(0, DATE_FORMATS.findIndex(([id]) => id === currentFormat));
        formatDropdown.set_selected(initialIndex);

        formatDropdown.connect('notify::selected-item', () => {
            const idx = formatDropdown.get_selected();
            settings.set_string(SETTINGS_KEYS.dateFormat, DATE_FORMATS[idx][0]);
        });

        formatRow.add_suffix(formatDropdown);
        formatRow.activatable_widget = formatDropdown;
        formatGroup.add(formatRow);

        const nepaliDigitRow = new Adw.SwitchRow({
            title: 'Use Nepali Digits',
            subtitle: 'Show numbers in Devanagari (०१२३...).',
        });
        settings.bind(SETTINGS_KEYS.useNepaliDigits, nepaliDigitRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        formatGroup.add(nepaliDigitRow);

        const gregHintRow = new Adw.SwitchRow({
            title: 'Show Gregorian Hints',
            subtitle: 'Display small AD day numbers inside month grid cells.',
        });
        settings.bind(SETTINGS_KEYS.showGregorianHints, gregHintRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        formatGroup.add(gregHintRow);

        const styleGroup = new Adw.PreferencesGroup({
            title: 'Colors',
            description: 'Use HEX values, for example #3b82f6',
        });
        page.add(styleGroup);

        styleGroup.add(this._buildColorRow(settings, SETTINGS_KEYS.accentColor,
            'Accent Color', 'Used for highlight and month title.'));
        styleGroup.add(this._buildDropdownRow(settings,
            SETTINGS_KEYS.todayHighlightStyle,
            TODAY_HIGHLIGHT_STYLES,
            'Today Highlight Style'));
        styleGroup.add(this._buildColorRow(settings, SETTINGS_KEYS.todayBorderColor,
            'Today Border Color', 'Border color for today\'s BS date cell.'));
        styleGroup.add(this._buildColorRow(settings, SETTINGS_KEYS.todayFillColor,
            'Today Fill Color', 'Fill color when today style includes fill.'));
        styleGroup.add(this._buildColorRow(settings, SETTINGS_KEYS.todayTextColor,
            'Today Text Color', 'Text color for today\'s BS date cell.'));
        styleGroup.add(this._buildColorRow(settings, SETTINGS_KEYS.panelTextColor,
            'Panel Text Color', 'Color for the top bar BS date label.'));
        styleGroup.add(this._buildColorRow(settings, SETTINGS_KEYS.popupBackground,
            'Popup Background', 'Background color for the calendar popup.'));

        window.set_default_size(680, 540);
    }

    _buildColorRow(settings, key, title, subtitle) {
        const row = new Adw.ActionRow({title, subtitle});
        const entry = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
            width_chars: 12,
            text: settings.get_string(key),
        });

        entry.connect('activate', () => {
            settings.set_string(key, entry.text.trim());
        });

        entry.connect('notify::has-focus', () => {
            if (!entry.has_focus)
                settings.set_string(key, entry.text.trim());
        });

        settings.connect(`changed::${key}`, () => {
            const value = settings.get_string(key);
            if (entry.text !== value)
                entry.text = value;
        });

        row.add_suffix(entry);
        row.activatable_widget = entry;
        return row;
    }

    _buildDropdownRow(settings, key, options, title) {
        const row = new Adw.ActionRow({title});
        const model = Gtk.StringList.new(options.map(([, label]) => label));
        const dropdown = new Gtk.DropDown({model});
        dropdown.valign = Gtk.Align.CENTER;

        const currentValue = settings.get_string(key);
        const initialIndex = Math.max(0, options.findIndex(([value]) => value === currentValue));
        dropdown.set_selected(initialIndex);

        dropdown.connect('notify::selected-item', () => {
            const idx = dropdown.get_selected();
            settings.set_string(key, options[idx][0]);
        });

        settings.connect(`changed::${key}`, () => {
            const value = settings.get_string(key);
            const index = options.findIndex(([v]) => v === value);
            if (index >= 0 && dropdown.get_selected() !== index)
                dropdown.set_selected(index);
        });

        row.add_suffix(dropdown);
        row.activatable_widget = dropdown;
        return row;
    }
}
