let serialportmodule = require("serialport");
let serialport = new serialportmodule("COM3", {baudRate: 115200});
let v1 = require("./v1.js");
let cors = require("cors");
let axios = require("axios");

// let urls = "https://aksantara3301.herokuapp.com/";
let urls = "http://localhost:8080/";

/* ONCLICK BUTTON BUAT STARTMAVLINK */
const startBtn = document.getElementById('startMav');
startBtn.addEventListener('click', function (event) {
    // GET_COORDINATE();
    START_MAVLINK();
});
/* ONCLICK BUTTON BUAT STARTMAVLINK */

const readParam = document.getElementById('readParam');
readParam.addEventListener('click', function (event) {
    if (use_v1) {
        v1.readAllParameters(serialport, v1, FC_v2_compatibility, use_v1);
    }

    setTimeout(() => {
        console.log(v1.parameters);
        // let params0 = v1.parameters[0];
        // console.log(params0.param_count);
    }, 20000);
});


/* VARIABLE BUAT MAVLINK */
let use_v1 = false;
exports.use_v1 = use_v1;
let FC_v2_compatibility = false;
/* VARIABLE BUAT MAVLINK */

/*  --------------------------------- MAVLINK --------------------------------- */
function START_MAVLINK() {
    console.log("Initializing MAVLink...");

    setTimeout(() => {
        if (v1.mavLinkv1ready) {
            console.log("MAVLink V1 ready...");
            let v2 = require("./v2.js");

            v2.mavLinkv2.on("COMMAND_LONG", function (bytes) {
                serialport.write(bytes);

                setTimeout(() => {
                    if (v2.mavLinkv2.protocol_version == 1) {
                        console.log("MAVLink V2 ready.");
                        console.log("FC uses MAVLink v1.");
                        FC_v2_compatibility = false;
                        exports.FC_v2_compatibility = FC_v2_compatibility;
                        use_v1 = true;
                        // START_MAVLINK.readAllParameters();
                        // v1.readAllParameters(serialport, v1, FC_v2_compatibility, use_v1);
                    } else {
                        console.log("MAVLink V2 ready.");
                        console.log("FC uses MAVLink v2.");
                        FC_v2_compatibility = true;
                        exports.FC_v2_compatibility = FC_v2_compatibility;
                        use_v1 = false;
                    }
                    console.log("MAVLink ready.");
                }, 1000);
            });

            serialport.on("data", function (data) {
                if (use_v1) {
                    v1.v1parse(data);
                    // let params0 = v1.parameters[0];
                    // console.log(params0.param_count);
                    // console.log(v1.parameters);
                } else {
                    v2.v2parse(data);
                }
            });
            // setInterval(() => {
            //     axios({
            //         method: "post",
            //         url: urls+"api/flightdata",
            //         data: v1.att,
            //     });
            // }, 200);
        } else {
            console.log("Failed to start");
        }
    }, 3000);
}

function GET_COORDINATE() {
    let id = [];
    let coordinates = [];
    // let counter = 0;

    setInterval(() => {
        axios.get(urls+'api/waypoints')
        .then(function (response) {
            id.push(response['data'].children[0]._id);

            if (id.length > 2) {
                id.shift();
                if (id[id.length-1] != id[id.length-2]) {
                    coordinates = response['data'].children;
                    SEND_WAYPOINT(coordinates);
                    // counter++;
                    // console.log(counter);
                }
            }
        })
        .catch(function (error) {
            console.log(error);
        });
    }, 1000);
}

function MISSION_COUNT(lenCoordinate) {
    let count = '';
    v1.mavLinkv1send.createMessage("MISSION_COUNT", {
        'target_system': 1,
        'target_component': 255,
        'count': lenCoordinate
    }, function (message) {
        console.log('v1 MISSION_COUNT');
        count = message.buffer;
    });
    serialport.write(count);
}

function SEND_WAYPOINT(coordinate) {
    /* Algoritma untuk mengirim WAYPOINT */
    let len = coordinate.length;
    let counter = 0;

    setTimeout(() => {
        MISSION_COUNT(len);
    }, 1000);

    setTimeout(() => {
        let intervalSend = setInterval(() => {
            let seq = v1.att.seq;
            if (counter < len) {
                let latitude = coordinate[counter].latitude;
                let longitude = coordinate[counter].longitude;
                v1.NAV_WAYPOINT(serialport, latitude, longitude, seq);
                counter += 1;
                // console.log("SEND Counter: " + counter);
            } else {
                clearInterval(intervalSend);
            }
        }, 1000);
    }, 1000);
    /* -------------------------------- */
}





















































    // /////////////////////////////////
    // //PARAMETER OPERATIONS///////////
    // /////////////////////////////////

    // /*
    // Operasi-operasi parameter ada 3 langkahnya :
    // 1. inisialisasi operasi : 
    //     jika FC meggunakan v2, menge-set MAVLink FC menjadi v1, 
    //     dan GCS juga menjadi v1 (agar dpt menggunakan library v1 
    //     yg support dgn parameter).
    // 2. eksekusi operasi : 
    //     lakukan operasi read all, read single, atau write.
    // 3. terminasi operasi : 
    //     jika FC menggunakan v2, menge-set MAVLink FC menjadi v2
    //     kembali, dan GCS juga menjadi v2 kembali.
    // */

    // //Inisialisasi operasi parameter
    // /*
    // To-do list:
    // - bikin mekanisme untuk acknowledge bhw FC telah diset mjd v1
    // */
    // function initialize_param_operation() {
    //     if (FC_v2_compatibility) {
    //         console.log('set FC to v1...');
    //         set_FC_to_v1();
    //         use_v1 = true;
    //     }
    // }

    // //Terminasi operasi parameter
    // /*
    // To-do list:
    // - bikin mekanisme untuk acknowledge bhw FC telah diset mjd v2.
    // saran : mungkin kalo gabisa lewat param_value, lewat heartbeat aja
    // acknowledgenya.
    // */
    // function terminate_param_operation() {
    //     if (FC_v2_compatibility) {
    //         console.log('set FC to v2...');
    //         set_FC_to_v2();
    //         use_v1 = false;
    //     }
    // }


    // //Fungsi mengirim param_set untuk mengubah mavlink FC jadi v1
    // function set_FC_to_v1() {
    //     //Hardcoded karena keterbatasan library
    //     let buf_set_to_v1 = Buffer.from([253,23,0,0,0,1,255,23,
    //         0,0,1,0,0,0,1,1,77,65,86,95,80,82,79,84,79,95,86,69,
    //         82,0,204,255,6,111,118]);
    //     serialport.write(buf_set_to_v1);
    // }


    // //Fungsi mengirim param_set untuk mengubah mavlink FC jadi v2
    // function set_FC_to_v2() {
    //     //Hardcoded karena keterbatasan library
    //     let buf_set_to_v2 = Buffer.from([253,23,0,0,0,1,255,23,0,
    //         0,2,0,0,0,1,1,77,65,86,95,80,82,79,84,79,
    //         95,86,69,82,0,204,255,6,163,155]);
    //     serialport.write(buf_set_to_v2);
    // }


    // //Operasi membaca semua parameter
    // /*
    // To-do list:
    // - bikin mekanisme untuk request parameter yang hilang
    // - efisienkan lagi setTimeout setTimeoutnya
    // */
    // function readAllParameters() {
    //     console.log('\nREADING ALL PARAMETERS');
    //     console.log('initializing param operation');
    //     initialize_param_operation();

    //     setTimeout(()=>{
    //         v1.mavLinkv1send.createMessage('PARAM_REQUEST_LIST',{
    //             target_system : 1,
    //             target_component : 255
    //         }, function (message) {
    //             console.log('request param');
    //             serialport.write(message.buffer);
    //         });
    //     },4000);

    //     setTimeout(()=>{
    //         console.log('terminating param operation');
    //         terminate_param_operation();
    //     },10000);
    // };


    // //Operasi membaca satu parameter
    // /*
    // To-do list:
    // - bikin mekanisme untuk request parameter kalo message tdk diterima
    // - efisienkan lagi setTimeout setTimeoutnya
    // */
    // function readSingleParameter(identifier, use_index) {
    //     console.log('\nREADING SINGLE PARAMETERS');
    //     console.log('initializing param operation');
    //     initialize_param_operation();

    //     setTimeout(()=>{
    //         if (use_index) {
    //             v1.mavLinkv1send.createMessage('PARAM_REQUEST_READ',{
    //                 target_system : 1,
    //                 target_component : 1,
    //                 param_id : '',
    //                 param_index : identifier
    //             }, function (message) {
    //                 console.log('request single param');
    //                 serialport.write(message.buffer);
    //             });
    //         } else {
    //             v1.mavLinkv1send.createMessage('PARAM_REQUEST_READ',{
    //                 target_system : 1,
    //                 target_component : 1,
    //                 param_id : identifier,
    //                 param_index : -1
    //             }, function (message) {
    //                 console.log('request single param');
    //                 serialport.write(message.buffer);
    //             });
    //         };
    //     },4000);

    //     setTimeout(()=>{
    //         console.log('terminating param operation');
    //         terminate_param_operation();
    //     },8000);
    // };


    // //Operasi menulis parameter
    // /*
    // To-do list:
    // - bikin mekanisme untuk menunggu acknowledge berupa PARAM_VALUE dr FC
    // - efisienkan lagi setTimeout setTimeoutnya
    // */
    // function writeParameter(param_id, param_value, param_type) {
    //     console.log('\n\nWRITING PARAMETER\n\n');
    //     console.log('initializing param operation');
    //     initialize_param_operation();

    //     setTimeout(()=>{
    //         v1.mavLinkv1send.createMessage('PARAM_SET',{
    //             target_system : 1,
    //             target_component : 1,
    //             param_id : param_id,
    //             param_value : param_value,
    //             param_type : param_type
    //         }, function (message) {
    //             console.log('writing param');
    //             serialport.write(message.buffer);
    //         });
    //     },4000);

    //     setTimeout(()=>{
    //         console.log('terminating param operation');
    //         terminate_param_operation();
    //     },8000);
    // }

    // START_MAVLINK.readAllParameters = readAllParameters;
    // START_MAVLINK.readSingleParameter = readSingleParameter;
    // START_MAVLINK.writeParameter = writeParameter;
// }