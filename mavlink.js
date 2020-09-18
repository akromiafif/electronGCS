let serialportmodule = require("serialport");
let serialport = new serialportmodule("COM3", {baudRate: 115200});
let v1 = require("./v1.js");
let cors = require("cors");
let axios = require("axios");

// let urls = "https://aksantara3301.herokuapp.com/";
let urls = "http://localhost:8080/";

const startBtn = document.getElementById('startMav');
startBtn.addEventListener('click', function (event) {
    // console.log("RUNNING");
    // GET_COORDINATE();
    START_MAVLINK();
    DOWNLOAD_MISSION();
});

function GET_COORDINATE() {
    let id = [];
    let coordinates = [];

    setInterval(() => {
        axios.get(urls+'api/waypoints')
        .then(function (response) {
            // console.log(response);
            id.push(response['data'].children[0]._id);

            if (id.length > 2) {
                id.shift();
                if (id[id.length-1] != id[id.length-2]) {
                    coordinates = response['data'].children;
                    SEND_WAYPOINT(coordinates);
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
    let latitude = coordinate[counter].latitude;
    let longitude = coordinate[counter].longitude;

    setTimeout(() => {
        MISSION_COUNT(len);
    }, 1000);

    setTimeout(() => {
        setInterval(() => {
            let seq = v1.att.seq;
            if (counter < len) {
                v1.NAV_WAYPOINT(serialport, latitude, longitude, seq);
            }
            counter += 1;
        }, 1000);
    }, 1000);
    /* -------------------------------- */
}


/*  --------------------------------- MAVLINK --------------------------------- */
function START_MAVLINK() {
    console.log("Initializing MAVLink...");

    let use_v1 = false;
    exports.use_v1 = use_v1;
    let FC_v2_compatibility = false;

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
                } else {
                    v2.v2parse(data);
                }
            });
            setInterval(() => {
                axios({
                    method: "post",
                    url: urls+"api/flightdata",
                    data: v1.att,
                });
            }, 200);
        } else {
            console.log("Failed to start");
        }
    }, 3000);
}

function MISSION_REQUEST_LIST() {
    let download = '';
    v1.mavLinkv1send.createMessage("MISSION_REQUEST_LIST ", {
        'target_system': 1,
        'target_component': 255,
        'mission_type': 0
    }, function (message) {
        console.log('v1 MISSION_REQUEST_LIST');
        download = message.buffer;
    });
    serialport.write(download);
}

function MISSION_REQUEST_INT(seq) {
    let request = '';
    v1.mavLinkv1send.createMessage("MISSION_REQUEST_LIST ", {
        'target_system': 1,
        'target_component': 255,
        'seq': seq,
        'mission_type': 0
    }, function (message) {
        console.log('v1 MISSION_REQUEST_LIST');
        request = message.buffer;
    });
    serialport.write(request);
}

function DOWNLOAD_MISSION() {
    let counter = 0;
    setTimeout(() => {
        MISSION_REQUEST_LIST();
    }, 4000);

    setTimeout(() => {
        setInterval(() => {
            let count = v1.att.count - 1;
            if (counter <= count) {
                v1.MISSION_REQUEST_INT(count);
            }
            counter += 1;
        }, 1000);
    }, 5000);
}


function startMavlink() {
    // setTimeout(() => {

        /*  --------------------------------- MAVLINK --------------------------------- */
        //PARAMETER MASIH HANYA COMPATIBLE DENGAN FC DENGAN FIRMWARE PIXHAWK
        console.log("Initializing MAVLink...");

        //Variabel untuk menentukan penggunaan library mana yang dipakai.
        var use_v1 = false;
        exports.use_v1 = use_v1;

        //Variabel untuk menentukan compatibility FC menggunakan mavlink v2.
        var FC_v2_compatibility = false;

        //Tahapan-tahapan inisialisasi MAVLink :
        // 1. Require library serialport
        // 2. Require library V1, tunggu hingga library ready
        // 3. Require library V2. Lakukan auto-negotiation
        //    untuk menentukan FC compatible dgn V2 atau tidak
        // 4. Kalau compatible, gunakan v2. kalau tidak, gunakan v1.
        // 5. Inisialisasi selesai

        //Require library serialport
        var serialportmodule = require("serialport");

        //Buat object serialport
        var serialport = new serialportmodule("COM3", {baudRate: 115200});

        //Require library mavlink v1.
        var v1 = require("./v1.js");

        //Variabel untuk menentukan penggunaan library mana yang dipakai.
        var use_v1 = false;
        exports.use_v1 = use_v1;

        //Variabel untuk menentukan compatibility FC menggunakan mavlink v2.
        var FC_v2_compatibility = false;

        //Timeout 3 detik untuk menunggu module selesai inisialisasi
        setTimeout(() => {
            if (v1.mavLinkv1ready) {
                console.log("MAVLink V1 ready...");

                //Setelah library v1 siap, baru library v2 di-require.
                //Hal ini karena sekalinya file v2.js di-require, proses
                //auto-negotiation langsung dijalanin. Jadi lbh baik satu
                //per-satu require librarynya daripada ribet di autonegotiation.
                v2 = require("./v2.js");

                //Proses auto negotiation dan penyelesaian inisialisasi.
                v2.mavLinkv2.on("COMMAND_LONG", function (bytes) {
                    //Mengirim MAV_CMD_REQUEST_PROTOCOL_VERSION ke FC
                    serialport.write(bytes);

                    //Timeout untuk menunggu auto-negotiation selesai.
                    setTimeout(() => {
                        if (v2.mavLinkv2.protocol_version == 1) {
                            console.log("MAVLink V2 ready.");
                            console.log("FC uses MAVLink v1.");
                            FC_v2_compatibility = false;
                            exports.FC_v2_compatibility = FC_v2_compatibility;
                            use_v1 = true;
                        } else {
                            console.log("MAVLink V2 ready.");
                            console.log("FC uses MAVLink v2.");
                            FC_v2_compatibility = true;
                            exports.FC_v2_compatibility = FC_v2_compatibility;
                            use_v1 = false;
                        }
                        console.log("MAVLink ready.");
                        // getCordinate();
                    }, 1000);
                });

                // parser data dari serialport
                // kirim data ke angular client
                serialport.on("data", function (data) {
                    //Parser yang digunakan tergantung variable use_v1
                    if (use_v1) {
                        v1.v1parse(data);
                        axios({
                            method: "post",
                            url: urls+"api/flightdata",
                            data: v1.att,
                        });
                    } else {
                        v2.v2parse(data);
                    }
                });

                //Eksekusi operasi read all parameters
                // setTimeout(readAllParameters, 5000);

                // setTimeout(() => {
                //   writeParameter('SERIAL1_BAUD\u0000\u0000\u0000\u0000',1.40129846432e-45,6)
                // }, 5000);

                // //Eksekusi operasi read single parameter
                // setTimeout(() => {
                //     readSingleParameter(6, true);
                // }, 10000);
            } else {
                console.log("Failed to start");
            }
        }, 3000);

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
        function initialize_param_operation() {
            if (FC_v2_compatibility) {
                console.log('set FC to v1...');
                set_FC_to_v1();
                use_v1 = true;
            }
        }

        //Terminasi operasi parameter
        /*
        To-do list:
        - bikin mekanisme untuk acknowledge bhw FC telah diset mjd v2.
        saran : mungkin kalo gabisa lewat param_value, lewat heartbeat aja
        acknowledgenya.
        */
        function terminate_param_operation() {
            if (FC_v2_compatibility) {
                console.log('set FC to v2...');
                set_FC_to_v2();
                use_v1 = false;
            }
        }


        //Fungsi mengirim param_set untuk mengubah mavlink FC jadi v1
        function set_FC_to_v1() {
            //Hardcoded karena keterbatasan library
            let buf_set_to_v1 = Buffer.from([253,23,0,0,0,1,255,23,
                0,0,1,0,0,0,1,1,77,65,86,95,80,82,79,84,79,95,86,69,
                82,0,204,255,6,111,118]);
            serialport.write(buf_set_to_v1);
        }


        //Fungsi mengirim param_set untuk mengubah mavlink FC jadi v2
        function set_FC_to_v2() {
            //Hardcoded karena keterbatasan library
            let buf_set_to_v2 = Buffer.from([253,23,0,0,0,1,255,23,0,
                0,2,0,0,0,1,1,77,65,86,95,80,82,79,84,79,
                95,86,69,82,0,204,255,6,163,155]);
            serialport.write(buf_set_to_v2);
        }


        //Operasi membaca semua parameter
        /*
        To-do list:
        - bikin mekanisme untuk request parameter yang hilang
        - efisienkan lagi setTimeout setTimeoutnya
        */
        function readAllParameters() {
            console.log('\nREADING ALL PARAMETERS');
            console.log('initializing param operation');
            initialize_param_operation();

            setTimeout(()=>{
                v1.mavLinkv1send.createMessage('PARAM_REQUEST_LIST',{
                    target_system : 1,
                    target_component : 255
                }, function (message) {
                    console.log('request param');
                    serialport.write(message.buffer);
                });
            },4000);

            setTimeout(()=>{
                console.log('terminating param operation');
                terminate_param_operation();
            },10000);
        };


        //Operasi membaca satu parameter
        /*
        To-do list:
        - bikin mekanisme untuk request parameter kalo message tdk diterima
        - efisienkan lagi setTimeout setTimeoutnya
        */
        function readSingleParameter(identifier,use_index) {
            console.log('\nREADING SINGLE PARAMETERS');
            console.log('initializing param operation');
            initialize_param_operation();

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
                terminate_param_operation();
            },8000);
        };


        //Operasi menulis parameter
        /*
        To-do list:
        - bikin mekanisme untuk menunggu acknowledge berupa PARAM_VALUE dr FC
        - efisienkan lagi setTimeout setTimeoutnya
        */
        function writeParameter(param_id,param_value,param_type) {
            console.log('\n\nWRITING PARAMETER\n\n');
            console.log('initializing param operation');
            initialize_param_operation();

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
            },4000);

            setTimeout(()=>{
                console.log('terminating param operation');
                terminate_param_operation();
            },8000);
        }
        /*  --------------------------------- MAVLINK --------------------------------- */

    // }, 3000);
}