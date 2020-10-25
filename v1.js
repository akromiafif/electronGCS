/*************
Initialization
**************/

//Requiring module
let mavlinkv1module = require('mavlink');

//MAVLink object
let mavLinkv1receive = new mavlinkv1module(0,0,"v1.0",["common"]);
let mavLinkv1send = new mavlinkv1module(1,255,"v1.0",["common"]);
exports.mavLinkv1receive = mavLinkv1receive;
exports.mavLinkv1send = mavLinkv1send;

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
    count: 0,
    lon: 99,
    lat: 99
}

let download = {
    count: 0
}

let downloadedMission = [];

let parameters = [];
let i = 0;

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

        mavLinkv1receive.on("GLOBAL_POSITION_INT", function(message, fields) {
            att.lon = fields.lon;
            att.lat = fields.lat;
            console.log(fields);
        });

        mavLinkv1receive.on("MISSION_REQUEST", function (message, fields) {
            // console.log(fields);
            att.seq = fields.seq
        });

        mavLinkv1receive.on("MISSION_COUNT", function(message, fields) {
            console.log("MISSION_COUNT");
            // console.log(fields);
            download.count = fields.count;
            att.count = fields.count;
        });

        mavLinkv1receive.on("MISSION_ITEM", function(message, fields) {
            downloadedMission.push(fields);
            // console.log(fields);
        });

        mavLinkv1receive.on("PARAM_VALUE", function(message, fields) {
            if (i > 342) {
                parameters = [];
                i = 0;
            }
            
            parameters.push(fields);
            // console.log(i);
            i++;
            
        });
    });
});

//Fungsi parser v1
function v1parse(data) {
    mavLinkv1receive.parse(data);
}
exports.v1parse = v1parse;
exports.att = att;
exports.download = download;
exports.downloadedMission = downloadedMission;
exports.parameters = parameters;

/* http://mavlink.io */
function NAV_WAYPOINT(serialport, autocontinue, command, current, frame, mission_type, param1, param2, param3, param4, target_component, target_system, x, y, z, seq) {
    // setTimeout(() => {
        let waypoint = '';
        mavLinkv1send.createMessage('MISSION_ITEM', {
            'command': command,
            'param1': param1,
            'param2': param2,
            'param3': param3,
            'param4': param4,
            'x': x,
            'y': y,
            'z': z,
            'target_system': target_system,
            'target_component': target_component,
            'seq': seq,
            'frame': frame,
            'mission_type': mission_type,
            'current': current,
            'autocontinue': autocontinue,
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

/////////////////////////////////
//PARAMETER OPERATIONS///////////
/////////////////////////////////

/*
Operasi-operasi parameter ada 3 langkahnya :
1. inisialisasi operasi : 
    jika FC meggunakan v2, menge-set MAVLink FC menjadi v1, 
    dan GCS juga menjadi v1 (agar dpt menggunakan library v1 
    yg support dgn parameter).
2. eksekusi operasi : 
    lakukan operasi read all, read single, atau write.
3. terminasi operasi : 
    jika FC menggunakan v2, menge-set MAVLink FC menjadi v2
    kembali, dan GCS juga menjadi v2 kembali.
*/

//Inisialisasi operasi parameter
/*
To-do list:
- bikin mekanisme untuk acknowledge bhw FC telah diset mjd v1
*/
function initialize_param_operation(FC_v2_compatibility, use_v1) {
    if (FC_v2_compatibility) {
        console.log('set FC to v1...');
        set_FC_to_v1();
        use_v1 = true;
    }
}

exports.initialize_param_operation = initialize_param_operation;

//Terminasi operasi parameter
/*
To-do list:
- bikin mekanisme untuk acknowledge bhw FC telah diset mjd v2.
saran : mungkin kalo gabisa lewat param_value, lewat heartbeat aja
acknowledgenya.
*/
function terminate_param_operation(FC_v2_compatibility, use_v1) {
    if (FC_v2_compatibility) {
        console.log('set FC to v2...');
        set_FC_to_v2();
        use_v1 = false;
    }
}

exports.terminate_param_operation = terminate_param_operation;

//Fungsi mengirim param_set untuk mengubah mavlink FC jadi v1
function set_FC_to_v1(serialport) {
    //Hardcoded karena keterbatasan library
    let buf_set_to_v1 = Buffer.from([253,23,0,0,0,1,255,23,
        0,0,1,0,0,0,1,1,77,65,86,95,80,82,79,84,79,95,86,69,
        82,0,204,255,6,111,118]);
    serialport.write(buf_set_to_v1);
}

exports.set_FC_to_v1 = set_FC_to_v1;

//Fungsi mengirim param_set untuk mengubah mavlink FC jadi v2
function set_FC_to_v2(serialport) {
    //Hardcoded karena keterbatasan library
    let buf_set_to_v2 = Buffer.from([253,23,0,0,0,1,255,23,0,
        0,2,0,0,0,1,1,77,65,86,95,80,82,79,84,79,
        95,86,69,82,0,204,255,6,163,155]);
    serialport.write(buf_set_to_v2);
}

exports.set_FC_to_v2 = set_FC_to_v2;

//Operasi membaca semua parameter
/*
To-do list:
- bikin mekanisme untuk request parameter yang hilang
- efisienkan lagi setTimeout setTimeoutnya
*/
function readAllParameters(serialport, v1, FC_v2_compatibility, use_v1) {
    console.log('\nREADING ALL PARAMETERS');
    console.log('initializing param operation');
    initialize_param_operation(FC_v2_compatibility, use_v1);

    setTimeout(()=>{
        v1.mavLinkv1send.createMessage('PARAM_REQUEST_LIST',{
            target_system : 1,
            target_component : 255
        }, function (message) {
            console.log('request param');
            serialport.write(message.buffer);
        });
    }, 4000);

    setTimeout(()=>{
        console.log('terminating param operation');
        terminate_param_operation(FC_v2_compatibility, use_v1);
    }, 10000);
};

exports.readAllParameters = readAllParameters;

//Operasi membaca satu parameter
/*
To-do list:
- bikin mekanisme untuk request parameter kalo message tdk diterima
- efisienkan lagi setTimeout setTimeoutnya
*/
function readSingleParameter(identifier, use_index, serialport, v1, FC_v2_compatibility, use_v1) {
    console.log('\nREADING SINGLE PARAMETERS');
    console.log('initializing param operation');
    initialize_param_operation(FC_v2_compatibility, use_v1);

    setTimeout(()=>{
        if (use_index) {
            v1.mavLinkv1send.createMessage('PARAM_REQUEST_READ',{
                target_system : 1,
                target_component : 1,
                param_id : '',
                param_index : identifier
            }, function (message) {
                console.log('request single param');
                serialport.write(message.buffer);
            });
        } else {
            v1.mavLinkv1send.createMessage('PARAM_REQUEST_READ',{
                target_system : 1,
                target_component : 1,
                param_id : identifier,
                param_index : -1
            }, function (message) {
                console.log('request single param');
                serialport.write(message.buffer);
            });
        };
    },4000);

    setTimeout(()=>{
        console.log('terminating param operation');
        terminate_param_operation(FC_v2_compatibility, use_v1);
    },8000);
};

exports.readSingleParameter = readSingleParameter;

//Operasi menulis parameter
/*
To-do list:
- bikin mekanisme untuk menunggu acknowledge berupa PARAM_VALUE dr FC
- efisienkan lagi setTimeout setTimeoutnya
*/
function writeParameter(param_id, param_value, param_type, serialport, v1, FC_v2_compatibility, use_v1) {
    console.log('\n\nWRITING PARAMETER\n\n');
    console.log('initializing param operation');
    initialize_param_operation(FC_v2_compatibility, use_v1);

    setTimeout(()=>{
        v1.mavLinkv1send.createMessage('PARAM_SET',{
            target_system : 1,
            target_component : 1,
            param_id : param_id,
            param_value : param_value,
            param_type : param_type
        }, function (message) {
            console.log('writing param');
            serialport.write(message.buffer);
        });
    }, 100);

    setTimeout(()=>{
        console.log('terminating param operation');
        terminate_param_operation(FC_v2_compatibility, use_v1);
    }, 200);
}

exports.writeParameter = writeParameter;
