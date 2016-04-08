express = require('express');
router = express.Router();
async = require ('async');
request = require('request-json');
CozyAPI = require('cozydb').api;

Config = require('../models/syncozies_config');
Permissions = require('../../package.json')['cozy-permissions'];

// TODO : remove it !
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


router.get('/config/', function(req, res, next) {
    CozyAPI.getCozyDomain(function(err, uri) {
        if (err) {
            uri = '';
        }
        res.render('config_server.jade', { urlOfLocal: uri });
    });
});


var createDevice = function(options, callback) {
    var client = request.createClient(options.uri);

    // client.setBasicAuth('owner', options.password);
    // It doesn't work with special (non-ascii) chars.
    // but this seems to work :
    var auth = 'owner:' + options.password ;
    auth = new Buffer(auth).toString('base64');
    client.headers['authorization'] = 'Basic ' + auth ;

    client.post(
        '/device/',
        { login: options.deviceName,
          permissions: options.permissions,
        },
        function(err, res, body) {
        if (err) {
            callback(err);
        } else if (res.statusCode === 401) {
            callback(new Error(res.reason));
        } else if (res.statusCode === 400) {
            callback(new Error(res.reason));

        } else {
            callback(null, body);
        }
    });
};


var getOrCreateConfig = function(callback) {
    Config.first(function(err, config) {
        if (config) {
            callback(null, config);
        } else {
            Config.create({}, callback);
        }
    });
};


var setFilter = function(options, callback) {
    var client = request.createClient(options.uri);
    client.setBasicAuth(options.deviceName, options.password);

    client.put('/ds-api/filters/config', buildFilter(),

      function(err, res, body) {
        if (err) {
            return callback(err);
        } else if (!(body && (body.success || body._id))) {
            err = body;
            return callback(err);
        } else {
            callback();
        }
    });
};

var buildFilter = function(options) {
    compare = "doc.docType && ("
    compare += "doc.docType.toLowerCase() === 'event'"
    compare += "|| doc.docType.toLowerCase() === 'contact'"
    compare += ")"

    // TODO ? add views attribute here, required by the DataSystem ?
    return {
        filters: {
            config: "function (doc) { return " + compare + "; }"
        }
    };
};

router.post('/config/', function(req, res, next) {
    var config = null;

    async.waterfall([
        getOrCreateConfig,
        function(conf, cb) {
            config = conf;

            // Create local device
            createDevice({
                uri: req.body.urlOfLocal,
                deviceName: req.body.deviceName,
                password: req.body.password,
                permissions: Permissions['cozy-permissions'],
            }, cb)
        },
        function(credentials, cb) {
            config.updateAttributes({
                deviceName: credentials.login,
                devicePasswordOnLocal: credentials.password,
            }, cb);
        },
        function(conf, cb) {
            // create remote device
            createDevice({
                uri: req.body.urlOfMain,
                deviceName: config.deviceName,
                password: req.body.password,
                permissions: Permissions['cozy-permissions'],
            }, cb);
        },
        function(credentials, cb) {
            config.updateAttributes({
                urlOfMain: req.body.urlOfMain,
                devicePasswordOnMain: credentials.password,
            }, cb);
        },
        function(conf, cb) {
            setFilter({
                uri: config.urlOfLocal,
                deviceName: config.deviceName,
                password: config.devicePasswordOnLocal,
            }, cb);
        },
        function(cb) {
            setFilter({
                uri: config.urlOfMain,
                deviceName: config.deviceName,
                password: config.devicePasswordOnMain,
            }, cb);
        },

        function(cb) {
            res.redirect('/');
            cb();
        },

    ], next);

});

var deleteDevice = function(options, callback) {
    var client = request.createClient(options.uri);
    // client.setBasicAuth('owner', options.password);
    // It doesn't work with special (non-ascii) chars.
    // but this seems to work :
    var auth = 'owner:' + options.password ;
    auth = new Buffer(auth).toString('base64');
    client.headers['authorization'] = 'Basic ' + auth ;

    client.delete('/device/' + options.deviceName,
        function(err, res, body) {
        if (err) {
            callback(err);
        } else {
            callback(null, body);
        }
    });
};

router.post('/config/reset', function(req, res, next) {
    var config = null;
    Config.first(function(err, config) {
        if (err) { return next(err); }

        async.series([
            function(cb) {
                deleteDevice({
                    uri: config.urlOfLocal,
                    deviceName: config.deviceName,
                    password: req.body.password
                }, cb);
            },
            function(cb) {
                deleteDevice({
                    uri: config.urlOfMain,
                    deviceName: config.deviceName,
                    password: req.body.password
                }, cb);
            },
            config.destroy.bind(config),
        ], function(err) {
            if (err) { return next(err); }

            res.status(200).send("Reset done");

        });
    });
});


// Export the router instance to make it available from other files.
module.exports = router;
