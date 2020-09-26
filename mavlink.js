let serialportmodule = require("serialport");
let serialport = new serialportmodule("COM3", {baudRate: 115200});
let v1 = require("./v1.js");
let cors = require("cors");
let axios = require("axios");

let urls = "https://aksantara3301.herokuapp.com/";
// let urls = "http://localhost:8080/";

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
        axios({
            method: "post",
            url: urls+"api/parameter",
            data: v1.parameters
        });

        console.log("Parameter has been sent");
    }, 20000);
});

function sendParams() {
    if (use_v1) {
        v1.readAllParameters(serialport, v1, FC_v2_compatibility, use_v1);
    }

    setTimeout(() => {
        axios({
            method: "post",
            url: urls+"api/parameter",
            data: v1.parameters
        });

        console.log(v1.parameters);
        console.log("Parameter has been sent");
    }, 16000);
}

/* VARIABLE BUAT MAVLINK */
let use_v1 = false;
exports.use_v1 = use_v1;
let FC_v2_compatibility = false;
let isInialize = false;
/* VARIABLE BUAT MAVLINK */

let sendParamInterval = setInterval(() => {
    if (isInialize) {
        axios.get(urls + "api/btnparams")
        .then(function (response) {
            // handle success
            let isClickedBtn = response.data.isClicked;
            // console.log(isClickedBtn);
            if (isClickedBtn) {
                sendParams();
            }
        })
        .catch(function (error) {
            // handle error
            console.log(error);
        });
    }
}, 5000);

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
                        isInialize = true;
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