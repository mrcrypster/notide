const WebSocketServer = require('ws');
const wss = new WebSocketServer.Server({ port: 8321 })
glob = require("glob")
fs = require('fs');
mysql = require('mysql');
lib = require('./lib');


wss.on("connection", (ws,r) => {
    let key = r.url.substring(1)

    console.log("Connected: " + key);
    
    ws.on("message", data => {
        lib.db("INSERT INTO queue VALUES(NULL, '" + key + "', 'in', ?)", [data.toString()]);
    });
    
    ws.on("close", () => {
        console.log("Disconnected");
    });
    
    ws.onerror = function () {
        console.log("Some Error occurred")
    }

    lib.listen_out(key, ws);
});