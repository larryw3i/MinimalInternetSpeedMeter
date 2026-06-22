/*
 * Name: Minimal Internet Speed Meter
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

export default class MinimalInternetSpeedMeter extends Extension {
  unitBase = 1024.0 // 1 GB == 1024MB or 1MB == 1024KB etc.
  units = ['KB/s', 'MB/s', 'GB/s', 'TB/s', 'PB/s', 'EB/s']

  float_scale = 1
  prevUploadBytes = 0
  prevDownloadBytes = 0
  prevSpeed = 0
  timeoutId = 0
  _netSpeedLabel = null
  _indicator = null
  _settings = null

  get showBytePerSecondText() {
    return this.settings.get_boolean('show-byte-per-second-text')
  }

  get refreshThresholdInSecond() {
    return this.settings.get_int('refresh-threshold-in-second')
  }

  get showBorder() {
    return this.settings.get_boolean('show-border')
  }

  get __netSpeedText() {
    let char_count = 10
    if (!this.showBytePerSecondText) {
      char_count = char_count - 3
    }
    let defaultNetSpeedText = ' '.repeat(char_count)

    return defaultNetSpeedText
  }

  get netSpeedLabelStyleClassName() {
    let className = 'netSpeedLabel'
    if (this.showBorder) {
      className += ' withBorder'
    }
    return className
  }

  // Read total download and upload bytes from /proc/net/dev file
  get netBytes() {
    let lines = Shell.get_file_contents_utf8_sync('/proc/net/dev').split('\n')
    let downloadBytes = 0
    let uploadBytes = 0
    for (let i = 0; i < lines.length; ++i) {
      let column = lines[i].trim().split(/\W+/)
      if (column.length <= 2) {
        break
      }
      if (
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
    this.netSpeedLabel.set_text(this.getFormattedSpeed(this.prevSpeed))
  }

  get settings() {
    if (!this._settings) {
      this._settings = super.getSettings()
      this.refreshThresholdInSecondHandlerId = this._settings.connectObject(
        'changed::refresh-threshold-in-second',
        () => {
          this.bindUpdateNetSpeed()
        }
      )

      this.showBytePerSecondHandlerId = this._settings.connectObject(
        'changed::show-byte-per-second-text',
        () => {
          this.refreshSpeed()
        }
      )

      this.showBorderHandlerId = this._settings.connectObject(
        'changed::show-border',
        () => {
          this.netSpeedLabel.set_style_class_name(
            this.netSpeedLabelStyleClassName
          )
        }
      )
    }
    return this._settings
  }

  get netSpeedLabel() {
    if (!this._netSpeedLabel) {
      this._netSpeedLabel = new St.Label({
        text: this.__netSpeedText,
        style_class: this.netSpeedLabelStyleClassName,
        y_align: Clutter.ActorAlign.CENTER,
      })
      this.indicator.add_child(this._netSpeedLabel)

      // Add the indicator to the panel
      Main.panel.addToStatusArea(this.uuid, this.indicator)

      this.indicator.menu.addAction(_('Preferences'), () =>
        this.openPreferences()
      )
    }
    return this._netSpeedLabel
  }

  get indicator() {
    if (!this._indicator) {
      this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false)
    }
    return this._indicator
  }

  // Update current net speed to shell
  updateNetSpeed() {
    if (!this.prevDownloadBytes || !this.prevUploadBytes) {
      let bytes = this.netBytes
      this.prevDownloadBytes = bytes[0]
      this.prevUploadBytes = bytes[1]
    }
    if (this.netSpeedLabel != null) {
      try {
        let bytes = this.netBytes
        let downloadBytes = bytes[0]
        let uploadBytes = bytes[1]

        // Current upload speed
        let uploadSpeed =
          (uploadBytes - this.prevUploadBytes) /
          this.refreshThresholdInSecond /
          this.unitBase

        // Current download speed
        let downloadSpeed =
          (downloadBytes - this.prevDownloadBytes) /
          this.refreshThresholdInSecond /
          this.unitBase

        // Show upload + download = total speed on the shell
        this.netSpeedLabel.set_text(
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
        this.netSpeedLabel.set_text(this.__netSpeedText)
      }
    }
    return false
  }

  _getFormattedSpeed(speed, speed_unit) {
    speed = speed.toFixed(this.float_scale).toString()
    let split_speeds = speed.split('.')
    let speed_int = split_speeds[0]
    let speed_float = split_speeds[1]

    if (speed_int.length < 4) {
      speed_int = ' '.repeat(4 - speed_int.length) + speed_int
    }
    speed = speed_int + '.' + speed_float
    if (!this.showBytePerSecondText) {
      speed_unit = speed_unit.slice(0, -3)
    }
    speed = speed + speed_unit

    return speed
  }

  // Format bytes to readable string
  getFormattedSpeed(speed) {
    let unit_index = 0
    while (speed >= this.unitBase) {
      // Convert speed to KB, MB, GB or TB
      speed /= this.unitBase
      ++unit_index
    }
    let speed_unit = this.units[unit_index]

    return this._getFormattedSpeed(speed, speed_unit)
  }

  bindUpdateNetSpeed() {
    if (this.timeoutId != 0) {
      GLib.Source.remove(this.timeoutId)
      this.timeoutId = 0
    }
    this.timeoutId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      this.refreshThresholdInSecond,
      this.updateNetSpeed.bind(this)
    )
  }

  deleteHandlerIds() {
    if (this.refreshThresholdInSecondHandlerId) {
      global.settings.disconnectObject(this.refreshThresholdInSecondHandlerId)
      this.refreshThresholdInSecondHandlerId = null
    }
    if (this.showBytePerSecondHandlerId) {
      global.settings.disconnectObject(this.showBytePerSecondHandlerId)
      this.showBytePerSecondHandlerId = null
    }
    if (this.showBorderHandlerId) {
      global.settings.disconnectObject(this.showBorderHandlerId)
      this.showBorderHandlerId = null
    }
  }

  unbindUpdateNetSpeed() {
    if (this.timeoutId != 0) {
      GLib.Source.remove(this.timeoutId)
      this.timeoutId = 0
    }

    if (this._netSpeedLabel) {
      this._netSpeedLabel.destroy()
      this._netSpeedLabel = null
    }

    if (this._indicator != null) {
      Main.panel._rightBox.remove_child(this._indicator)
      this._indicator.destroy()
      this._indicator = null
    }

    this.deleteHandlerIds()

    if (this._settings) {
      this._settings = null
    }
  }

  enable() {
    this.bindUpdateNetSpeed()
  }

  disable() {
    this.unbindUpdateNetSpeed()
  }
}

// The end.
