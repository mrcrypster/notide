module.exports = {
    listen_out: function (key, ws) {
        return listen(key, ws, 'out');
    },

    listen_in: function (key, ws) {
        return listen(key, ws, 'in');
    },

    db: db
};



function listen(key, ws, type) {
    if ( ws.readyState != 1 ) {
        return;
    }

    db("SELECT * FROM queue WHERE k = '" + key + "' AND type = '" + type + "'", [], function(r) {
        if ( r ) r.forEach(function(row) {
            ws.send(row.data, function (err) {
                if ( err ) {
                    console.log('error');
                    console.log(row.data);
                }
            });
            db("DELETE FROM queue WHERE id = " + row.id);
        });
    });

    setTimeout(function() { listen(key, ws, type); }, 50);
}



let con = null;
function db(sql, params, cb) {
    params = params || [];

    if ( !con ) {
        con = mysql.createConnection({
          host: 'localhost', user: 'notide', password: 'notide', database: 'notide'
        });

        con.connect(function(err) {
          if (err) throw err;
          con.query(sql, params, function(err, res) {
            if ( cb && !err ) {
                cb(res);
            }
          });
        });
    }
    else {
        con.query(sql, params, function(err, res) {
            if ( cb && !err ) {
                cb(res);
            }
        });
    }
}