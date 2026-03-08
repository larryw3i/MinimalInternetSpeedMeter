/*
 * Name: Minimal Internet Speed Meter
 * Description: A simple and minimal internet speed meter extension for Gnome
 * Shell.
 * Author: larryw3i
 * GitHub: https://github.com/larryw3i/CrazyInternetSpeedMeter
 * License: GPLv3.0
 *
 */

import Gio from 'gi://Gio'
import Gtk from 'gi://Gtk'
import Adw from 'gi://Adw'
import {
    ExtensionPreferences,
    gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

export default class MinimalInternetSpeedMeterPreferences extends ExtensionPreferences {
    getPetNameWithSpace_T() {
        let petName0 = _('Minimal Internet Speed Meter')
        let petName1 = _('Internet Speed Meter')
        let petName = petName1
        return petName
    }

    fillPreferencesWindow(window) {
        window.set_title(this.getPetNameWithSpace_T())
        window._settings = this.getSettings()
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        })
        window.add(page)

        const group = new Adw.PreferencesGroup({
            title: _('Appearance'),
            description: _('Configure the appearance of %s.').format(
                this.getPetNameWithSpace_T()
            ),
        })
        page.add(group)

        const showBytePerSecondTextRow = new Adw.SwitchRow({
            title: _('Show "B/s" text'),
            subtitle: _('Whether to show "B/s" text.'),
        })
        group.add(showBytePerSecondTextRow)
        window._settings.bind(
            'show-byte-per-second-text',
            showBytePerSecondTextRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        )

        const refreshThresholdInSecondRow = new Adw.SpinRow({
            title: _('Refresh threshold (in second)'),
            subtitle: _(
                'Refresh the network traffic speed after specific time.'
            ),
            numeric: true,
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 5,
                step_increment: 1,
            }),
        })
        group.add(refreshThresholdInSecondRow)
        window._settings.bind(
            'refresh-threshold-in-second',
            refreshThresholdInSecondRow,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        )

        const showBorderRow = new Adw.SwitchRow({
            title: _('Show border'),
            subtitle: _('Whether to show border.'),
        })
        group.add(showBorderRow)
        window._settings.bind(
            'show-border',
            showBorderRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        )
    }
}

// The end.
