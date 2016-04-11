// filters management (yc remote !)
//
PouchDB = require('pouchdb');

Config = require('./models/syncozies_config');
printit = require('printit');

var log = printit({
  prefix: 'SynCozies',
  date: true
});

/**
 * Instantiage a new pouchdb on the specified remote Couch,
 * setting up authentification.
 */
var _newPouchDB = function(uri, deviceName, password) {
    var auth = deviceName + ':' + password + '@' ;
    if (uri.indexOf('https') === 0) {
        uri = 'https://' + auth + uri.slice(8) ;
    } else { // Assume it's http
        uri = 'http://' + auth + uri.slice(7) ;
    }

    if (uri[uri.length - 1] === '/') {
        uri = uri.slice(0, -1);
    }

    uri = uri + '/replication';
    return new PouchDB(uri);
};



NO_SYNC_DOCTYPES = {
    'access': true,
    'application': true,
    'cozyinstance':true,
    'device':true,
    'stackapplication': true,
    'syncoziesconfig': true,
    'user': true,
    'usetracker': true,
};


var replication = null;

module.exports.start = function(callback) {
    if (replication) {
        return callback(new Error('Already running'));
    }

    Config.first(function(err, config) {
        if (err) { return log.error(err); }

        // else launch !
        var local = _newPouchDB(config.urlOfLocal, config.deviceName,
                                config.devicePasswordOnLocal);
        var main = _newPouchDB(config.urlOfMain, config.deviceName,
                                config.devicePasswordOnMain);


        // init replication !
        replication = local.sync(main, {
            batch_size: 20,
            batches_limit: 5,
            // filter: 'filter-' + config.deviceName + '-config/config',
            filter: function(doc) {
                return doc.docType && !(doc.docType.toLowerCase() in NO_SYNC_DOCTYPES);
            },
            live: true,
            retry: true,
            heartbeat: false,
        });

        replication.on('change', function(info) {
            var msg = 'Change ';
            if (info) {
                msg += info.direction + ' ';
                if (info.change) {
                    msg += info.change.start_time;
                    msg += ' last_seq: ';
                    msg += info.change.last_seq;
                }

            }
            log.info(msg);
        });
        replication.on('error', function(error) {
            log.error(error);
        })
        callback();
    });
};

module.exports.stop = function(callback) {
    replication.cancel();
    replication = null;
};

module.exports.isRunning = function() {
    return replication != null;
};
