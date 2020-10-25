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
    DOWNLOAD_MISSION();
});

const sendParam = document.getElementById('sendParam');
sendParam.addEventListener('click', function (event) {

});

/* VARIABLE BUAT MAVLINK */
let use_v1 = false;
exports.use_v1 = use_v1;
let FC_v2_compatibility = false;
let isInitialize = false;
/* VARIABLE BUAT MAVLINK */

/* INTERVAL SEND, GET PARAMETER */
let btnStatusInterval = setInterval(() => {
    if (isInitialize) {
        axios.get(urls + "api/btnparams")
        .then(function (response) {
            if (response.data.getParamBtn) {
                sendParamsToGCS();
                sendBtnStatus({ getParamBtn: false, sendParamBtn: response.data.sendParamBtn, getWaypointBtn: false, sendWaypointBtn: false });
            }

            if (response.data.sendParamBtn) {
                getNewParamsFromServer();
                sendBtnStatus({ getParamBtn: response.data.getParamBtn, sendParamBtn: false, getWaypointBtn: false, sendWaypointBtn: false })
            }

            if (response.data.sendWaypointBtn) {
                axios.get(urls+'api/waypoints')
                .then(function (response) {
                    coordinates = response['data'].children;
                    console.log(coordinates);

                    sendWaypoint(coordinates);
                })
                .catch(function (error) {
                    console.log(error);
                });

                sendBtnStatus({ getParamBtn: false, sendParamBtn: false, getWaypointBtn: false, sendWaypointBtn: false });
            }

            if (response.data.getWaypointBtn) {
                DOWNLOAD_MISSION();
                sendBtnStatus({ getParamBtn: false, sendParamBtn: false, getWaypointBtn: false, sendWaypointBtn: false });
            }

            console.log(response.data);
        })
        .catch(function (error) {
            console.log(error);
        });
    }
}, 3000);
/* INTERVAL SEND, GET PARAMETER */

function sendBtnStatus(objBtnStatus) {
    axios.post(urls+"api/btnparam", objBtnStatus)
    .then(function (response) {
        console.log(response);
    }) 
    .catch(function (error) {
        console.log(error);
    });
}

/*  --------------------------------- START MAVLINK --------------------------------- */
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
                        isInitialize = true;
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
                if (isInitialize) {
                    // console.log(v1.att);
                    axios.post(urls+"api/flightdata", v1.att)
                      .then(function (response) {
                        // console.log(response);
                    })
                      .catch(function (error) {
                        console.log(error);
                    });
                }
            }, 200);
        } else {
            console.log("Failed to start");
        }
    }, 3000);
}
/*  --------------------------------- START MAVLINK --------------------------------- */

function sendParamsToGCS() {
    if (use_v1) {
        v1.readAllParameters(serialport, v1, FC_v2_compatibility, use_v1);
    }

    setTimeout(() => {
        axios.post(urls+"api/parameter", v1.parameters)
            .then(function (response) {
            console.log(response);
            }) 
            .catch(function (error) {
                console.log(error);
            });

        console.log(v1.parameters);
        console.log("Parameter has been sent");
        timToGet = true;
    }, 16000);
}

function sendParamsToFC(newParams) {
    let i = 0;
    let sendToFCInterval = setInterval(() => {
        if (i < newParams.length) {
            v1.writeParameter(newParams[i].param_id, newParams[i].param_value, newParams[i].param_type, serialport, v1, FC_v2_compatibility, use_v1);
        }
        
        if (i > newParams.length) {
            clearInterval(sendToFCInterval);
            console.log("Finish writing paramater to FC");
        }

        i++;
    }, 500);
}

function getNewParamsFromServer() {
    let newParams = [];

    axios.get(urls+"api/parameters")
    .then(function (response) {
        newParams = response.data.children;
        console.log(newParams);
    }) 
    .catch(function (error) {
        console.log(error);
    });

    console.log("Start writing new parameter to FC");
    setTimeout(() => {
        sendParamsToFC(newParams);
    }, 1000);
}

function missionCount(lenCoordinate) {
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

function sendWaypoint(coordinate) {
    /* Algoritma untuk mengirim WAYPOINT */
    let len = coordinate.length;
    let counter = 0;

    setTimeout(() => {
        missionCount(len);
    }, 1000);

    setTimeout(() => {
        let intervalSend = setInterval(() => {
            let seq = v1.att.seq;
            if (counter < len) {
                let autocontinue = coordinate[counter].autocontinue;
                let command = coordinate[counter].command;
                let current = coordinate[counter].current;
                let frame = coordinate[counter].frame;
                let mission_type = coordinate[counter].mission_type;
                let param1 = coordinate[counter].param1;
                let param2 = coordinate[counter].param2;
                let param3 = coordinate[counter].param3;
                let param4 = coordinate[counter].param4;
                let target_component =coordinate[counter].target_component;
                let target_system = coordinate[counter].target_system;
                let x = coordinate[counter].x;
                let y = coordinate[counter].y;
                let z = coordinate[counter].z

                v1.NAV_WAYPOINT(serialport, autocontinue, command, current, frame, mission_type, param1, param2, param3, param4, target_component, target_system, x, y, z, seq);
                counter += 1;
                // console.log("SEND Counter: " + counter);
            } else {
                clearInterval(intervalSend);
            }
        }, 1000);
    }, 1000);
    /* -------------------------------- */
}

function DOWNLOAD_MISSION() {
    MISSION_REQUEST_LIST();

    setTimeout(() => {
        console.log("START DOWNLOADING MISSION");
        let length = v1.download.count;
        let i = 0;

        let downloadInterval = setInterval(() => {
            if (i < length) {
                MISSION_REQUEST(i);
                i++;
            } else {
                clearInterval(downloadInterval);
                console.log("TERMINATE DOWNLOADING MISSION");

                setTimeout(() => {
                    console.log("RESULT ALL MISSION");
                    console.log(v1.downloadedMission);

                    axios.post(urls+"api/waypoint", v1.downloadedMission)
                    .then(function (response) {
                        console.log(response);
                    }) 
                    .catch(function (error) {
                        console.log(error);
                    });
                }, 1000);
            }
        }, 500);
    }, 1000);
}

function MISSION_REQUEST_LIST() {
    let count = '';
    v1.mavLinkv1send.createMessage("MISSION_REQUEST_LIST", {
        'target_system': 1,
        'target_component': 255,
        'mission_type': 0
    }, function (message) {
        console.log('v1 MISSION_REQUEST_LIST');
        count = message.buffer;
    });
    serialport.write(count);
}

function MISSION_REQUEST(seq) {
    let count = '';
    v1.mavLinkv1send.createMessage("MISSION_REQUEST", {
        'target_system': 1,
        'target_component': 255,
        'seq': seq,
        'mission_type': 0
    }, function (message) {
        console.log('v1 MISSION_REQUEST');
        // console.log(seq);
        count = message.buffer;
    });
    serialport.write(count);
}