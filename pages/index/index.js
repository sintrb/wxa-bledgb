//index.js
//获取应用实例
const app = getApp()

import codec from '../../utils/codec.js'


Page({
    data: {
        version: "1.0",
        ble: {
            devices: [],
            available: false,
            discovering: false,
        },
        device: null,
        characteristic: null,

        datatypes: ['HEX', 'DEC', 'BIN', 'TEXT'],
        encodetypes: ['ASCII', 'UTF8', 'GBK',],
        config: {
            datatype: 'HEX',
            encodetype: 'GBK',
            data: '',
        },
        logs: [],
    },
    logIx: 0,
    log() {
        console.log.apply(console, arguments);
        // return;
        let args = [];
        for (let i = 0; i < arguments.length; ++i) {
            args.push(arguments[i]);
        }
        let t = args.join(" ");
        let logs = this.data.logs;
        let lastLog = {
            index: this.logIx++,
            content: t,
        };
        logs.push(lastLog)
        logs.splice(0, logs.length - 50);
        this.setData({ logs, lastLog });
    },
    onLoad: function (options) {
        let thiz = this;
        // this.onBleDevicesFound({
        //     devices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].map(r => {
        //         return {
        //             name: "X",
        //             RSSI: -99,
        //             // connected: true,
        //             deviceId: "12321312-1231231-12" + r,
        //             advertisServiceUUIDs: [
        //                 "CDDDSE-EEXAS",
        //             ],
        //             services: [
        //                 {
        //                     uuid: '12123-1-21-212',
        //                     isPrimary: true,
        //                     characteristics: [
        //                         {
        //                             uuid: '123123',
        //                             serviceId: '12123-1-21-212',
        //                             properties: {
        //                                 read: true,
        //                                 write: false,
        //                                 notify: false,
        //                                 indicate: true,
        //                             }
        //                         },
        //                         {
        //                             uuid: '133123',
        //                             properties: {
        //                                 read: false,
        //                                 write: true,
        //                                 notify: false,
        //                                 indicate: true,
        //                             }
        //                         }
        //                     ]
        //                 }
        //             ]
        //         };
        //     }),
        // });
        // this.setData({
        //     device: this.data.ble.devices[0],
        //     char: this.data.ble.devices[0].services[0].characteristics[0],
        // });


        wx.onBluetoothAdapterStateChange(function (res) {
            thiz.updateBleState(res);
        })
        wx.onBLEConnectionStateChange(function (res) {
            console.log(`device ${res.deviceId} state has changed, connected: ${res.connected}`)
            thiz.updateBleDevice(res.deviceId, { connected: res.connected });
        })
        wx.openBluetoothAdapter({
            success: function (res) {
                console.log(res)
                wx.getBluetoothAdapterState({
                    success: function (res) {
                        thiz.updateBleState(res);
                    }
                })

                wx.onBluetoothDeviceFound(function (res) {
                    console.log('new device list has founded', res);
                    thiz.onBleDevicesFound(res);
                })
            }
        });

        try {
            let config = JSON.parse(wx.getStorageSync('config'));
            console.log(config)
            this.setData({ config });
        }
        catch (e) {

        }
        this.log("没有可显示设备，请打开蓝牙点击'搜索'来查找周围的BLE设备!");
    },
    onBleDevicesFound(res) {
        let thiz = this;
        let rawdevs = this.data.ble.devices;
        res.devices.map(dev => {
            let rawdev = rawdevs.find((a) => {
                return a.deviceId == dev.deviceId;
            });
            if (!rawdev) {
                thiz.log("found", dev.deviceId);
                rawdevs.push(dev);
            }
            else {
                Object.keys(dev).map(f => {
                    rawdev[f] = dev[f];
                });
            }
        });
        this.updateBleState({
            devices: rawdevs
        });
    },
    updateBleState(state) {
        let thiz = this;
        let ble = thiz.data.ble;
        let rawavailable = ble.available;
        let rawdiscovering = ble.discovering;
        Object.keys(state).map(k => {
            ble[k] = state[k];
        });
        thiz.setData({
            ble: ble
        });
        if (ble.available && !rawavailable) {
            this.log("bluetooth enable");
        }
        else if (!ble.available && rawavailable) {
            this.log("bluetooth disable");
        }

        if (ble.discovering && !rawdiscovering) {
            this.log("bluetooth scaning");
        }
        else if (!ble.discovering && rawdiscovering) {
            this.log("bluetooth scan stopped");
        }
    },
    updateBleDevice(deviceId, state) {
        console.log(`updateBleDevice`, deviceId, state)
        let thiz = this;
        let ble = thiz.data.ble;
        let dev = ble.devices.find((a) => {
            return a.deviceId == deviceId;
        });
        if (dev) {
            if (!dev.connected && state.connected) {
                thiz.log("connected", dev.deviceId);
                this.onGetDeviceServices(null, deviceId);
            }
            else if (dev.connected && state.connected === false) {
                thiz.log("disconnected", dev.deviceId);
            }
            Object.keys(state).map(k => {
                dev[k] = state[k];
            });
            if (this.data.device && this.data.device.deviceId == deviceId) {
                thiz.setData({
                    ble: ble,
                    device: dev
                });
            }
            else {
                thiz.setData({
                    ble: ble,
                });
            }
        }
    },
    updateDeviceService(deviceId, serviceId, state) {
        // console.log(`updateBleDevice`, deviceId, serviceId, state);
        let thiz = this;
        let ble = thiz.data.ble;
        let dev = ble.devices.find((a) => {
            return a.deviceId == deviceId;
        });
        if (dev) {
            let ser = dev.services.find((a) => {
                return a.uuid == serviceId;
            });
            if (ser) {
                Object.keys(state).map(k => {
                    ser[k] = state[k];
                });
                if (this.data.device && this.data.device.deviceId == deviceId) {
                    thiz.setData({
                        ble: ble,
                        device: dev
                    });
                }
                else {
                    thiz.setData({
                        ble: ble,
                    });
                }
            }
        }
    },
    startScanBle() {
        let thiz = this;
        this.updateBleState({
            devices: [],
        })
        thiz.log("start scanning...");
        wx.startBluetoothDevicesDiscovery({
            // services: ['FEE7'],
            success: function (res) {
                thiz.log("start", res.errMsg)
            }
        });

    },
    stopScanBle() {
        let thiz = this;
        thiz.log("stop scanning...");
        wx.stopBluetoothDevicesDiscovery({
            success: function (res) {
                thiz.log("stop", res.errMsg)
            }
        })
    },
    clearAll() {
        let ble = this.data.ble;
        ble.devices = [];
        this.setData({
            device: null,
            char: null,
            lastLog: null,
            logs: [],
            ble: ble,
        });
    },
    onConnectDevice(e, devid) {
        let thiz = this;
        let deviceId = devid ? devid : this.data.device.deviceId;
        let ble = thiz.data.ble;
        let dev = ble.devices.find((a) => {
            return a.deviceId == deviceId;
        });

        if (dev.connected) {
            thiz.log('disconnect', deviceId);
            wx.closeBLEConnection({
                deviceId: deviceId,
            });
        }
        else {
            thiz.log('connecting', deviceId);
            wx.createBLEConnection({
                deviceId: deviceId,
            });
        }

    },
    onGetDeviceServices(e, devid) {
        let thiz = this;
        let deviceId = devid ? devid : this.data.device.deviceId;
        if (!devid && !this.data.device.connected) {
            thiz.log("not connected", this.data.char.deviceId);
            return;
        }
        thiz.log('getting services...');
        wx.getBLEDeviceServices({
            deviceId: deviceId,
            success: function (res) {
                console.log('device services:', res.services)
                thiz.log('service got, count', res.services.length);
                thiz.updateBleDevice(deviceId, { services: res.services })
            }
        });
    },
    onSelectDevice(e) {
        let thiz = this;
        let deviceId = e.target.dataset.deviceid;
        if (this.data.device && this.data.device.deviceId == deviceId && this.data.device.connected) {
            // 断开
            this.onConnectDevice(null, deviceId);
            this.setData({
                device: null,
                char: null,
            });
        }
        else {
            let device = this.data.ble.devices.find(function (d) {
                return d.deviceId == deviceId;
            });
            this.setData({
                device: device
            });
            if (!device.connected) {
                this.onConnectDevice(null, deviceId);
            }
        }
    },
    onServiceSelected(e) {
        let thiz = this;
        let deviceId = this.data.device.deviceId;
        let serviceId = e.target.dataset.serviceid;
        thiz.log('getting characteristics...');
        wx.getBLEDeviceCharacteristics({
            deviceId: deviceId,
            serviceId: serviceId,
            success: function (res) {
                if (res && res.characteristics) {
                    thiz.log('characteristics got, count', res.characteristics.length);
                    thiz.updateDeviceService(deviceId, serviceId, { characteristics: res.characteristics });
                }
            }
        });
    },
    onCharacteristicSelected(e) {
        let serviceId = e.target.dataset.serviceid;
        let charId = e.target.dataset.charid;
        let ble = this.data.ble;
        let dev = this.data.device;
        let ser = dev && dev.services.find((a) => {
            return a.uuid == serviceId;
        });
        let char = ser && ser.characteristics.find((a) => {
            return a.uuid == charId;
        });
        if (this.data.char && this.data.char.uuid == charId) {
            this.setData({
                char: null
            });
        }
        else {
            char.serviceId = serviceId;
            this.setData({
                char: char
            });
        }
    },
    onWrite(e) {
        let thiz = this;
        if (this.data.char) {
            if (!this.data.device.connected) {
                thiz.log("not connected", this.data.char.deviceId);
                return;
            }
            if (!this.data.char.properties.write) {
                thiz.log("not writeable", this.data.char.uuid);
                return;
            }
            var rawdata = this.data.config.data;
            var data = [];
            if (this.data.config.datatype == 'TEXT') {
                if (this.data.config.encodetype == 'GBK') {
                    data = codec.gbk.encode(rawdata);
                }
                else if (this.data.config.encodetype == 'UTF8') {
                    data = codec.utf8.encode(rawdata);
                }
                else {
                    data = codec.ascii.encode(rawdata);
                }
            }
            else {
                let strs = rawdata.split(" ");
                let d = {
                    HEX: 16,
                    DEC: 10,
                    BIN: 2
                }[this.data.config.datatype];
                for (let i = 0; i < strs.length; ++i) {
                    let s = strs[i].trim();
                    if (!s)
                        continue;
                    try {
                        let v = parseInt(s, d);
                        if (isNaN(v)) {
                            throw Exception("NaN");
                        }
                        data.push(v);
                    }
                    catch (e) {
                        thiz.log("parse", s, 'to', this.data.config.datatype, " fail");
                        return;
                    }
                }
            }
            // console.log(data);
            let buffer = new ArrayBuffer(data.length);
            let dataView = new DataView(buffer);
            for (let i = 0; i < data.length; ++i) {
                dataView.setUint8(i, data[i]);
            }
            thiz.log("writing...");
            wx.writeBLECharacteristicValue({
                deviceId: this.data.device.deviceId,
                serviceId: this.data.char.serviceId,
                characteristicId: this.data.char.uuid,
                value: buffer,
                success: function (res) {
                    thiz.log('write', res.errMsg);
                }
            });
            wx.setStorageSync('config', JSON.stringify(this.data.config));
        }
        else {
            thiz.log("not select characteristic");
        }
    },
    onRead(e) {
        let thiz = this;
        if (this.data.char) {
            if (!this.data.device.connected) {
                thiz.log("not connected", this.data.char.deviceId);
                return;
            }
            if (!this.data.char.properties.read) {
                thiz.log("not readable", this.data.char.uuid);
                return;
            }
            thiz.log("reading...");
            wx.onBLECharacteristicValueChange(function (characteristic) {
                let value = characteristic.value;
                let bytes = new Uint8Array(characteristic.value);
                var data = "";
                if (bytes) {
                    if (thiz.data.config.datatype == 'TEXT') {
                        if (thiz.data.config.encodetype == 'GBK') {
                            data = codec.gbk.decode(bytes);
                        }
                        else if (thiz.data.config.encodetype == 'UTF8') {
                            data = codec.utf8.decode(bytes);
                        }
                        else {
                            data = codec.ascii.decode(bytes);
                        }
                    }
                    else {
                        let dx = {
                            HEX: [16, 2],
                            DEC: [10, 0],
                            BIN: [2, 8]
                        }[thiz.data.config.datatype];
                        let d = dx[0];
                        let l = dx[1];
                        let j = "00000000000000";
                        let chars = new Array(bytes.length);
                        for (let i = 0; i < bytes.length; ++i) {
                            let t = bytes[i];
                            let s = t.toString(d);
                            if (s.length < l) {
                                chars[i] = j.substr(0, l - s.length) + s;
                            }
                            else {
                                chars[i] = s;
                            }

                        }
                        data = chars.join(" ");
                    }
                }
                thiz.log('read len', value.byteLength, ":", data);
            });

            wx.readBLECharacteristicValue({
                deviceId: this.data.device.deviceId,
                serviceId: this.data.char.serviceId,
                characteristicId: this.data.char.uuid,
                success: function (res) {
                    thiz.log('read', res.errMsg);
                }
            });
        }
        else {
            thiz.log("not select characteristic");
        }
    },
    onDataTypeChange(e) {
        let config = this.data.config;
        config.datatype = this.data.datatypes[e.detail.value];
        this.setData({
            config
        })
    },
    onEncodeTypeChange(e) {
        let config = this.data.config;
        config.encodetype = this.data.encodetypes[e.detail.value];
        this.setData({
            config
        })
    },
    onDataChange(e) {
        this.data.config.data = e.detail.value;
    },
    onEmpty(e) {

    },
})

