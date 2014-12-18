addEventListener('DOMContentLoaded', function() {
'use strict';

var model = document.querySelector('#model');

Polymer.mixin(model, {
  devices: [],

  ready: function() {
    var self = this;
    window.onerror = function(message) {
      console.error(message.stack || message);
      self.$.error.text = 'Error: ' + message;
      self.$.error.show();
    };
  },

  scanBluetooth: function() {
    var self = this;
    navigator.bluetooth.requestDevice([{
      services: [
        navigator.bluetooth.uuids.canonicalUUID(0x180A),
      ],
    }], {
      connectForServices: true,
    }).then(function(device) {
      return device.connect().then(function() { return device; });
    }).then(function(device) {
      self.devices = self.devices.concat([device]);
    }).catch(function(error) {
      if (error.name !== 'NotFoundError') {
        window.onerror(error);
      }
    });
  },

  closeDevice: function(e) {
    var device = e.target.device;
    this.devices = this.devices.filter(function(device) {
      return device.address !== e.target.device.address;
    });
  },
});

});
