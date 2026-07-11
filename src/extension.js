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
  float_scale = 1
  prevUploadBytes = 0
  prevDownloadBytes = 0
  timeoutId = 0
  currentSpeed = 0
  nm_proxy = null
  NM = 'org.freedesktop.NetworkManager'
  NM_PATH = '/org/freedesktop/NetworkManager'

  _netSpeedLabel = null
  _indicator = null
  _settings = null
  _netInterfaces = null

  unitBase = 1024.0 // 1 GB == 1024MB or 1MB == 1024KB etc.
  units = ['KB/s', 'MB/s', 'GB/s', 'TB/s', 'PB/s', 'EB/s', '*B/s']

  constructor(metadata) {
    super(metadata)
  }

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
    let __netSpeedText = '   0'
    __netSpeedText =
      this.float_scale > 0
        ? __netSpeedText + '.' + '0'.repeat(this.float_scale)
        : __netSpeedText
    __netSpeedText += 'K'
    __netSpeedText = this.showBytePerSecondText
      ? __netSpeedText + 'B/s'
      : __netSpeedText

    return __netSpeedText
  }

  get netSpeedLabelStyleClassName() {
    let className = 'net-speed-label'
    if (this.showBorder) {
      className += ' with-border'
    }
    return className
  }

  get netInterfaces() {
    if (!this._netInterfaces) {
      const ifaces = new Set()

      // IPv4
      const v4_route = Shell.get_file_contents_utf8_sync('/proc/net/route')
      v4_route.split('\n').forEach((line) => {
        const c = line.trim().split(/\s+/)
        if (c[1] === '0'.repeat(8) && c[2] !== '0'.repeat(8)) {
          ifaces.add(c[0])
        }
      })

      // IPv6
      const v6_route = Shell.get_file_contents_utf8_sync('/proc/net/ipv6_route')
      v6_route.split('\n').forEach((line) => {
        const c = line.trim().split(/\s+/)
        if (c[0] === '0'.repeat(32) && c[4] !== '0'.repeat(32)) {
          ifaces.add(c[9])
        }
      })
      this._netInterfaces = ifaces
    }
    return this._netInterfaces
  }

  // Read total download and upload bytes from /proc/net/dev file
  get netBytes() {
    const netDev = Shell.get_file_contents_utf8_sync('/proc/net/dev')
    let downloadBytes = 0
    let uploadBytes = 0

    netDev.split('\n').forEach((line) => {
      const match = line.match(/^(\S+):/)
      if (!match) return

      const iface = match[1]
      if (!this.netInterfaces.has(iface)) return

      const cols = line.trim().split(/\s+/)
      const download = Number(cols[1])
      const upload = Number(cols[9])

      if (download >= 0 && upload >= 0) {
        downloadBytes += download
        uploadBytes += upload
      }
    })
    return [downloadBytes, uploadBytes]
  }

  get settings() {
    if (!this._settings) {
      this._settings = super.getSettings()
      this._settings.connectObject(
        'changed::refresh-threshold-in-second',
        () => {
          this.enable()
        },
        this
      )

      this._settings.connectObject(
        'changed::show-byte-per-second-text',
        () => {
          this.netSpeedLabel.set_text(this.getFormattedSpeed(this.currentSpeed))
        },
        this
      )

      this._settings.connectObject(
        'changed::show-border',
        () => {
          this.netSpeedLabel.set_style_class_name(
            this.netSpeedLabelStyleClassName
          )
        },
        this
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
      this.indicator.menu.addAction(_('Preferences'), () =>
        this.openPreferences()
      )
    }
    return this._netSpeedLabel
  }

  get indicator() {
    if (!this._indicator) {
      this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false)
      Main.panel.addToStatusArea(this.uuid, this._indicator)
    }
    return this._indicator
  }

  // Update current net speed to shell
  updateNetSpeed() {
    try {
      let netBytes = this.netBytes
      let downloadBytes = netBytes[0]
      let uploadBytes = netBytes[1]
      let prevBytes = this.prevDownloadBytes + this.prevUploadBytes

      if (0.0 < prevBytes && prevBytes <= downloadBytes + uploadBytes) {
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
        this.currentSpeed = uploadSpeed + downloadSpeed
      } else {
        this.netSpeedLabel.set_text(this.__netSpeedText)
      }

      this.prevUploadBytes = uploadBytes
      this.prevDownloadBytes = downloadBytes
      return true
    } catch (e) {
      console.error(e, _('Can not fetch internet speed from "/proc/net/dev".'))
      this.netSpeedLabel.set_text(this.__netSpeedText)
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
    speed = speed || 0
    let unit_index = 0
    while (speed >= this.unitBase) {
      // Convert speed to KB, MB, GB or TB
      speed /= this.unitBase
      ++unit_index
    }
    unit_index =
      unit_index >= this.units.length ? this.units.length - 1 : unit_index
    let speed_unit = this.units[unit_index]

    return this._getFormattedSpeed(speed, speed_unit)
  }

  enable() {
    if (this.timeoutId != 0) {
      GLib.Source.remove(this.timeoutId)
      this.timeoutId = 0
    }
    this.timeoutId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      this.refreshThresholdInSecond,
      this.updateNetSpeed.bind(this)
    )

    this.nm_proxy = Gio.DBusProxy.new_for_bus_sync(
      Gio.BusType.SYSTEM,
      Gio.DBusProxyFlags.NONE,
      null,
      this.NM,
      this.NM_PATH,
      this.NM,
      null
    )
    this.nm_proxy.connectObject(
      'g-properties-changed',
      () => {
        this._netInterfaces = null
      },
      this
    )
  }

  disable() {
    if (this.timeoutId != 0) {
      GLib.Source.remove(this.timeoutId)
      this.timeoutId = 0
    }

    if (this._netSpeedLabel != null) {
      this._netSpeedLabel.destroy()
      this._netSpeedLabel = null
    }

    if (this._indicator != null) {
      this._indicator.destroy()
      this._indicator = null
    }

    this.settings.disconnectObject(this)
    this.nm_proxy.disconnectObject(this)
    if (this.nm_proxy != null) {
      this.nm_proxy = null
    }
    this.prevDownloadBytes = 0
    this.prevUploadBytes = 0
    this.currentSpeed = 0

    if (this._settings) {
      this._settings = null
    }
  }
}

// The end.
