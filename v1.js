/*************
Initialization
**************/

//Requiring module
var mavlinkv1module = require('mavlink');

//MAVLink object
var mavLinkv1receive = new mavlinkv1module(0,0,"v1.0",["common"]);
var mavLinkv1send = new mavlinkv1module(1,255,"v1.0",["common"]);
exports.mavLinkv1receive = mavLinkv1receive;
exports.mavLinkv1send = mavLinkv1send;

var att = {
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

//Nunggu sampe module mavlink ready
mavLinkv1receive.on('ready', function (){
    mavLinkv1send.on('ready', function(){
        var mavLinkv1ready = true;
        exports.mavLinkv1ready = mavLinkv1ready;
        
        /********
        Receiving
        *********/

        // mavLinkv1receive.on('PARAM_VALUE',function(message,fields){
        //     console.log(fields);
        //     if (fields.param_id == 'MAV_PROTO_VER\u0000\u0000\u0000') {
        //         if (fields.param_value == 1.401298464324817e-45) {
        //             console.log('MAVLink FC has been set to V1!');
        //             proto_ver_index = fields.param_index;
        //             exports.proto_ver_index = proto_ver_index;
        //         }
        //     };
        // });

        // mavLinkv1receive.on('GLOBAL_POSITION_INT',function(message,fields){
        //     console.log(fields);
        // });

        // mavLinkv1receive.on('HEARTBEAT', function(message,fields){
        //     console.log('v1 dapet heartbeat...')
        // });

        mavLinkv1receive.on("ATTITUDE", function(message, fields) {
            att.time_boot_ms = fields.time_boot_ms;
            att.pitch = fields.pitch;
            att.roll = fields.roll;
            att.yaw = fields.yaw;
        });

        mavLinkv1receive.on("VFR_HUD", function(message, fields) {
            att.airspeed = fields.airspeed;
            att.groundspeed = fields.groundspeed;
            att.alt = fields.alt;
        });

        mavLinkv1receive.on("COMMAND_ACK", function(message, fields) {
            console.log(fields);
        });

        mavLinkv1receive.on("MISSION_ACK", function(message, fields) {
            console.log(fields);
        });

        // mavLinkv1receive.on("message", function(message) {
        //     console.log(message);
        // });

        // mavLinkv1receive.on("GPS_RAW_INT", function(message, fields) {
        //     console.log(fields);
        // });

        mavLinkv1receive.on("MISSION_REQUEST", function (message, fields) {
            // console.log(fields);
            att.seq = fields.seq
        });

        mavLinkv1receive.on("MISSION_COUNT", function(message, fields) {
            // console.log(fields);
            att.count = fields.count
        });
        
        // mavLinkv1receive.on("MISSION_ITEM_REACHED", function(message, fields) {
        //     console.log(fields);
        //     console.log("Mission reached");
        // });
        // mavLinkv1receive.on("MISSION_CURRENT", function(message, fields) {
        //     console.log(fields);
        //     console.log("Mission current");
        // });
    });
});

//Fungsi parser v1
function v1parse(data) {
    mavLinkv1receive.parse(data);
}
exports.v1parse = v1parse;
exports.att = att;

function RTLV1(serialport) {
    let rtl = '';
    mavLinkv1send.createMessage('COMMAND_LONG', {
        target_system: 1,
        target_component: 255,
        command: 20,
        confirmation: 0,
        param1: 2,
        param2: 0.0,
        param3: 0.0,
        param4: 0.0,
        param5: 0.0,
        param6: 0.0,
        param7: 0.0
    }, function(message) {
        console.log('v1 RETURN TO LAUNCH');
        rtl = message.buffer;
    });
    serialport.write(rtl);
}

exports.RTLV1 = RTLV1;

function NAV_WAYPOINT(serialport, lat, long, seq) {
    // setTimeout(() => {
        let waypoint = '';
        mavLinkv1send.createMessage('MISSION_ITEM', {
            'command': 16,
            'param1': 0,
            'param2': 10,
            'param3': 0.0,
            'param4': 10,
            'x': lat,
            'y': long,
            'z': 10,
            'target_system': 1,
            'target_component': 255,
            'seq': seq,
            'frame': 2,
            'mission_type': 0,
            'current': 1,
            'autocontinue': 0,
        }, function(message) {
            console.log('v1 NAV_TO_WAYPOINT');
            waypoint = message.buffer;
        });
        serialport.write(waypoint);
    // }, 1000);
}

exports.NAV_WAYPOINT = NAV_WAYPOINT;

function GPS_STATUS(serialport) {
    let waypoint = '';
    mavLinkv1send.createMessage("GPS_STATUS", {
        'satellites_visible':		5,
        'satellite_prn':			[1, 2, 3, 4, 5],
        'satellite_used':			[2, 3, 4, 5, 6],
        'satellite_elevation':		[3, 4, 5, 6, 7],
        'satellite_azimuth':		[4, 5, 6, 7, 8],
        'satellite_snr':			[5, 6, 7, 8, 9]
    }, function(message) {
        // console.log(message);
        console.log("GPS_STATUS");
        waypoint = message.buffer;
    });
    serialport.write(waypoint);
}

exports.GPS_STATUS = GPS_STATUS;

function MISSION_REQUEST_LIST(serialport) {
    let list = '';
    mavLinkv1send.createMessage("MISSION_REQUEST_LIST", {
        'target_system': 1,
        'target_component': 255
        }, function(message) {
            console.log("MISSION_REQUEST_LIST");
            list = message.buffer;
    });
    serialport.write(list);
}

exports.MISSION_REQUEST_LIST = MISSION_REQUEST_LIST;