(function () {
'use strict';

function getCharacteristicValue(service, characteristicId) {
  if (typeof characteristicId === 'number')
    characteristicId = navigator.bluetooth.uuids.canonicalUUID(characteristicId);
  return service.getCharacteristic(characteristicId).then(function(characteristic) {
    return characteristic && characteristic.readValue();
  });
}

var utf8Decoder = new TextDecoder('utf-8');

function DeviceInfoService(service) {
  var self = this;
  self.service = service;
  self.manufacturerName = undefined;
  self.modelNumber = undefined;
  self.serialNumber = undefined;
  self.hardwareRevision = undefined;
  self.firmwareRevision = undefined;
  self.softwareRevision = undefined;
  self.systemId = undefined;
  // Omitting ieee_11073-20601_regulatory_certification_data_list.
  self.pnpId = undefined;

  function loadUtf8Characteristic(uuid, fieldName) {
    getCharacteristicValue(service, uuid).then(function(valueArray) {
      self[fieldName] = valueArray && utf8Decoder.decode(valueArray);
    }).catch(window.onerror);
  }

  loadUtf8Characteristic(0x2A29, 'manufacturerName');
  loadUtf8Characteristic(0x2A24, 'modelNumber');
  loadUtf8Characteristic(0x2A25, 'serialNumber');
  loadUtf8Characteristic(0x2A27, 'hardwareRevision');
  loadUtf8Characteristic(0x2A26, 'firmwareRevision');
  loadUtf8Characteristic(0x2A28, 'softwareRevision');

  getCharacteristicValue(service, 0x2A23).then(function(systemIdArray) {
    if (systemIdArray === null) {
      self.systemId = null;
      return;
    }
    if (systemIdArray.byteLength != 8) {
      throw new Error('Unexpected length in System ID: ' + systemIdArray.length);
    }
    var bytes = new Uint8Array(systemIdArray);
    // 40 bits fit in a JS Number, but we can't use shift operators since
    // they're constrained to 32 bits.
    var manufacturerIdentifier = (bytes[0] * 0x1 +
                                  bytes[1] * 0x100 +
                                  bytes[2] * 0x10000 +
                                  bytes[3] * 0x1000000 +
                                  bytes[4] * 0x100000000);
    var organizationallyUniqueIdentifier = (bytes[5] * 0x1 +
                                            bytes[6] * 0x100 +
                                            bytes[7] * 0x10000);
    self.systemId = { manufacturerIdentifier: manufacturerIdentifier,
                      organizationallyUniqueIdentifier: organizationallyUniqueIdentifier };
  }).catch(window.onerror);

  getCharacteristicValue(service, 0x2A50).then(function(pnpIdArray) {
    if (pnpIdArray === null) {
      self.pnpId = null;
      return;
    }
    if (pnpIdArray.byteLength < 7) {
      throw new Error('Not enough bytes in PnP_ID: ' + pnpIdArray.length);
    }
    var decoder = new DataView(pnpIdArray);
    var vendorIdSource = decoder.getUint8(0);
    var vendorIdSourceString;
    switch (vendorIdSource) {
      case 1: vendorIdSourceString = "Bluetooth"; break;
      case 2: vendorIdSourceString = "USB"; break;
      default: vendorIdSourceString = "Reserved<" + vendorIdSource + ">"; break;
    }
    self.pnpId = {
      vendorIdSource: vendorIdSource,
      vendorIdSourceString: vendorIdSourceString,
      vendorId: decoder.getUint16(1, true),
      productId: decoder.getUint16(3, true),
      productVersion: decoder.getUint16(5, true),
    };
  }).catch(window.onerror);
};
window.DeviceInfoService = DeviceInfoService;

})();
