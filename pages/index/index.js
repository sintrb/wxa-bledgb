//index.js
//获取应用实例
const app = getApp()

Page({

    data: {
        ble: {
            devices: [],
            available: false,
            discovering: false,
        }
    },
    onLoad: function (options) {
        let thiz = this;
        this.onBleDevicesFound({
            devices: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(r => {
                return {
                    name: "X",
                    RSSI: -99,
                    deviceId: "12321312-1231231-12" + r,
                    advertisServiceUUIDs: [
                        "CDDDSE-EEXAS",
                    ],
                    services: [
                        { uuid: '12123-1-21-212', isPrimary: true }
                    ]
                };
            }),
        });
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
        })
    },
    onBleDevicesFound(res) {
        let rawdevs = this.data.ble.devices;
        res.devices.map(dev => {
            let rawdev = rawdevs.find((a) => {
                return a.deviceId == dev.deviceId;
            });
            if (!rawdev) {
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
        Object.keys(state).map(k => {
            ble[k] = state[k];
        });
        thiz.setData({
            ble: ble
        })
    },
    updateBleDevice(deviceId, state) {
        let thiz = this;
        let ble = thiz.data.ble;
        let dev = ble.devices.find((a) => {
            return a.deviceId == deviceId;
        });
        if (dev) {
            Object.keys(state).map(k => {
                dev[k] = state[k];
            });
            thiz.setData({
                ble: ble
            });
        }
    },
    startScanBle() {
        this.updateBleState({
            devices: []
        })
        wx.startBluetoothDevicesDiscovery({
            // services: ['FEE7'],
            success: function (res) {
                console.log(`start`, res)
            }
        })
    },
    stopScanBle() {
        wx.stopBluetoothDevicesDiscovery({
            success: function (res) {
                console.log(`stop`, res)
            }
        })
    },
    onConnectDevice(e) {
        let thiz = this;
        let deviceId = e.target.dataset.deviceid;
        let ble = thiz.data.ble;
        let dev = ble.devices.find((a) => {
            return a.deviceId == deviceId;
        });

        if (dev.connected) {
            wx.closeBLEConnection({
                deviceId: deviceId,
            });
        }
        else {
            wx.createBLEConnection({
                deviceId: deviceId,
            });
        }

    },
    onGetDeviceServices(e) {
        let thiz = this;
        let deviceId = e.target.dataset.deviceid;
        wx.getBLEDeviceServices({
            deviceId: deviceId,
            success: function (res) {
                console.log('device services:', res.services)
                thiz.updateBleDevice(deviceId, { services: res.services })
            }
        });
    }
})
