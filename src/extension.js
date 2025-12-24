/*
 * Name: Crazy Internet Speed Meter
 * Description: A simple and minimal internet speed meter extension for Gnome
 * Shell.
 * Author: larryw3i
 * GitHub: https://github.com/larryw3i/CrazyInternetSpeedMeter
 * License: GPLv3.0
 *
 * Name: Internet Speed Meter
 * Description: A simple and minimal internet speed meter extension for Gnome
 * Shell.
 * Author: Al Shakib
 * GitHub: https://github.com/AlShakib/InternetSpeedMeter
 * License: GPLv3.0
 */

import GLib from 'gi://GLib'
import Gio from 'gi://Gio'
import St from 'gi://St'
import Clutter from 'gi://Clutter'
import Shell from 'gi://Shell'

import {
    Extension,
    gettext as _,
    ngettext,
    pgettext,
} from 'resource:///org/gnome/shell/extensions/extension.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js'

export default class CrazyInternetSpeedMeter extends Extension {
    unitBase = 1024.0 // 1 GB == 1024MB or 1MB == 1024KB etc.
    units = ['KB/s', 'MB/s', 'GB/s', 'TB/s', 'PB/s', 'EB/s']

    float_scale = 1
    prevUploadBytes = 0
    prevDownloadBytes = 0
    prevSpeed = 0
    container = null
    timeoutId = 0
    _netSpeedLabel = null
    _indicator = null
    _settings = null

    getShowBytePerSecondText() {
        return this.getSettings().get_boolean('show-byte-per-second-text')
    }

    getRefreshThresholdInSecond() {
        return this.getSettings().get_int('refresh-threshold-in-second')
    }

    getShowBorder() {
        return this.getSettings().get_boolean('show-border')
    }

    getNetSpeedText0() {
        let char_count = 10
        if (!this.getShowBytePerSecondText()) {
            char_count = char_count - 3
        }
        let defaultNetSpeedText = ' '.repeat(char_count)

        return defaultNetSpeedText
    }

    getNetSpeedLabelStyleClassName() {
        let name = 'netSpeedLabel'
        if (this.getShowBorder()) {
            name += ' withBorder'
        }
        return name
    }

    // Read total download and upload bytes from /proc/net/dev file
    getNetBytes() {
        let lines =
            Shell.get_file_contents_utf8_sync('/proc/net/dev').split('\n')
        let downloadBytes = 0
        let uploadBytes = 0
        for (let i = 0; i < lines.length; ++i) {
            let column = lines[i].trim().split(/\W+/)
            if (column.length <= 2) {
                break
            }
            if (
                // Refer to https://github.com/AlShakib/InternetSpeedMeter/\
                // blob/master/src/extension.js
                !column[0].match(/^lo$/) &&
                !column[0].match(/^br[0-9]+/) &&
                !column[0].match(/^tun[0-9]+/) &&
                !column[0].match(/^tap[0-9]+/) &&
                !column[0].match(/^vnet[0-9]+/) &&
                !column[0].match(/^virbr[0-9]+/) &&
                !column[0].match(/^proton[0-9]+/) &&
                !column[0].match(/^(veth|br-|docker0)[a-zA-Z0-9]+/)
            ) {
                let download = parseInt(column[1])
                let upload = parseInt(column[9])
                if (!isNaN(download) && !isNaN(upload)) {
                    downloadBytes += download
                    uploadBytes += upload
                }
            }
        }
        return [downloadBytes, uploadBytes]
    }

    refreshSpeed() {
        let netSpeedLabel = this.getNetSpeedLabel()
        netSpeedLabel.set_text(this.getFormattedSpeed(this.prevSpeed))
    }

    getSettings() {
        if (!this._settings) {
            this._settings = super.getSettings()
            let netSpeedLabel = this.getNetSpeedLabel()
            this._settings.connect(
                'changed::refresh-threshold-in-second',
                () => {
                    this.bindUpdateNetSpeed()
                }
            )

            this._settings.connect('changed::show-byte-per-second-text', () => {
                this.refreshSpeed()
            })

            this._settings.connect('changed::show-border', () => {
                netSpeedLabel.set_style_class_name(
                    this.getNetSpeedLabelStyleClassName()
                )
            })
        }
        return this._settings
    }

    getNetSpeedLabel() {
        if (!this._netSpeedLabel) {
            // Create a panel button
            let indicator = this.getIndicator()

            this._netSpeedLabel = new St.Label({
                text: this.getNetSpeedText0(),
                style_class: this.getNetSpeedLabelStyleClassName(),
                y_align: Clutter.ActorAlign.CENTER,
            })
            indicator.add_child(this._netSpeedLabel)

            // Add the indicator to the panel
            Main.panel.addToStatusArea(this.uuid, indicator)

            indicator.menu.addAction(_('Preferences'), () =>
                this.openPreferences()
            )
        }
        return this._netSpeedLabel
    }

    getIndicator() {
        if (!this._indicator) {
            this._indicator = new PanelMenu.Button(
                0.0,
                this.metadata.name,
                false
            )
        }
        return this._indicator
    }

    // Update current net speed to shell
    updateNetSpeed() {
        let netSpeedLabel = this.getNetSpeedLabel()
        if (!this.prevDownloadBytes || !this.prevUploadBytes) {
            let bytes = this.getNetBytes()
            this.prevDownloadBytes = bytes[0]
            this.prevUploadBytes = bytes[1]
        }
        if (netSpeedLabel != null) {
            try {
                let bytes = this.getNetBytes()
                let downloadBytes = bytes[0]
                let uploadBytes = bytes[1]

                // Current upload speed
                let uploadSpeed =
                    (uploadBytes - this.prevUploadBytes) /
                    this.getRefreshThresholdInSecond() /
                    this.unitBase

                // Current download speed
                let downloadSpeed =
                    (downloadBytes - this.prevDownloadBytes) /
                    this.getRefreshThresholdInSecond() /
                    this.unitBase

                // Show upload + download = total speed on the shell
                netSpeedLabel.set_text(
                    this.getFormattedSpeed(uploadSpeed + downloadSpeed)
                )

                this.prevUploadBytes = uploadBytes
                this.prevDownloadBytes = downloadBytes
                this.prevSpeed = uploadSpeed + downloadSpeed
                return true
            } catch (e) {
                console.log(
                    _('Can not fetch internet speed from "/proc/net/dev": %s'),
                    e
                )
                netSpeedLabel.set_text(this.getNetSpeedText0())
            }
        }
        return false
    }

    // Format bytes to readable string
    getFormattedSpeed(speed) {
        // if this.settings
        let i = 0
        while (speed >= this.unitBase) {
            // Convert speed to KB, MB, GB or TB
            speed /= this.unitBase
            ++i
        }
        let speed_unit = this.units[i]

        return this.getFormattedSpeed0(speed, speed_unit)
    }

    getFormattedSpeed0(speed, speed_unit) {
        speed = speed.toFixed(this.float_scale).toString()
        let split_speeds = speed.split('.')
        let speed_int = split_speeds[0]
        let speed_float = split_speeds[1]

        if (speed_int.length < 4) {
            speed_int = ' '.repeat(4 - speed_int.length) + speed_int
        }
        speed = speed_int + '.' + speed_float
        if (!this.getShowBytePerSecondText()) {
            speed_unit = speed_unit.slice(0, -3)
        }
        speed = speed + speed_unit

        return speed
    }

    delSettings() {
        if (this._settings) {
            this._settings = null
        }
    }

    delIndicator() {
        if (this._indicator != null) {
            Main.panel._rightBox.remove_child(this._indicator)
            this._indicator.destroy()
            this._indicator = null
        }
    }

    delNetSpeedLabel() {
        if (this._netSpeedLabel) {
            this._netSpeedLabel.destroy()
            this._netSpeedLabel = null
        }
        this.delIndicator()
        this.delSettings()
    }

    bindUpdateNetSpeed() {
        if (this.timeoutId != 0) {
            GLib.Source.remove(this.timeoutId)
            this.timeoutId = 0
        }
        this.timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            this.getRefreshThresholdInSecond(),
            this.updateNetSpeed.bind(this)
        )
    }

    unbindUpdateNetSpeed() {
        if (this.timeoutId != 0) {
            GLib.Source.remove(this.timeoutId)
            this.timeoutId = 0
        }
        this.delNetSpeedLabel()
    }

    enable() {
        this.bindUpdateNetSpeed()
    }

    disable() {
        this.unbindUpdateNetSpeed()
    }
}

// The end.
