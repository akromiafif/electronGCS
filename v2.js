"use strict";

let att = {
    time_boot_ms: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
    rollspeed: 0,
    pitchspeed: 0,
    yawspeed: 0,
    airspeed: 0,
    groundspeed: 0,
    heading: 0,
    throtlle: 0,
    alt: 0,
    climb: 0,
    seq: 0,
    count: 0
}

/*************
Initialization
**************/
exports.__esModule = true;
exports.HeartbeatV2 = exports.v2parse = exports.mavLinkv2 = void 0;
var node_mavlink_1 = require("@ifrunistuttgart/node-mavlink");
var message_registry_1 = require("./assets/message-registry");
var heartbeat_1 = require("./assets/messages/heartbeat");
var v1_js_1 = require("./v1.js");
exports.mavLinkv2 = new node_mavlink_1.MAVLinkModule(message_registry_1.messageRegistry, 1, true);

/********
Receiving
*********/
exports.mavLinkv2.on('message', function (message) {
    //handle message
    //console.log(message);
});

exports.mavLinkv2.on('error', function (e) {
    //handle error
});

exports.mavLinkv2.on('HEARTBEAT', function (message) {
    //handle heartbeat
    console.log('v2 dapet heartbeat...');
});

exports.mavLinkv2.on('ATTITUDE', function (message) {
    console.log('v2 dapet attitude...');
});

exports.mavLinkv2.on('PARAM_VALUE', function (message) {
    //Karena library v2 ga support param_id, identifiernya pake param_index
    if (message.param_index == v1_js_1.proto_ver_index) {
        if (message.param_value == 2.802596928649634e-45) {
            console.log('MAVLink FC has been set to V2!');
        }
    }
});

//Fungsi v2parse
function v2parse(data) {
    exports.mavLinkv2.parse(data);
}
exports.v2parse = v2parse;

//Fungsi membuat buffer heartbeat dlm framing v2
function HeartbeatV2() {
    var myHeartbeat = new heartbeat_1.Heartbeat(1, 255);
    myHeartbeat.type = 1;
    myHeartbeat.autopilot = 1;
    myHeartbeat.base_mode = 1;
    myHeartbeat.custom_mode = 0;
    myHeartbeat.system_status = 1;
    var heartbeatBuffer = exports.mavLinkv2.pack([myHeartbeat]);
    return heartbeatBuffer;
}
exports.HeartbeatV2 = HeartbeatV2;

