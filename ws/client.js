const WebSocketServer = require('ws');
const wss = new WebSocketServer.Server({ port: 8322 })
glob = require("glob")
fs = require('fs');
mysql = require('mysql');
lib = require('./lib');


function ask(key, cmd, context) {
    let data = JSON.stringify({cmd: cmd, context: context});
    lib.db("INSERT INTO queue VALUES(NULL, '" + key + "', 'out', ?)", [data.toString()]);
}


wss.on("connection", (ws,r) => {
    let key = r.url.substring(1)
    let queue_dir = '/var/lib/notide/queues/' + key;
    if ( !fs.existsSync(queue_dir) ) {
        fs.mkdirSync(queue_dir)
    }

    console.log("Connected: " + key);
    
    ws.on("message", data => {
        data = JSON.parse(data);
        ask(key, data.cmd, data.context);
    });
    
    ws.on("close", () => {
        console.log("Disconnected");
    });
    
    ws.onerror = function () {
        console.log("Some Error occurred")
    }

    lib.listen_in(key, ws);
});