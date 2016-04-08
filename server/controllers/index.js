var express = require('express');
var router = express.Router();

Replicator = require('../replicator');

// Main route of the application to test the HTTP API.
router.get('/', function(req, res, next) {
    res.render('index.jade', { isRunning: Replicator.isRunning() });
});

router.post('/start', function(req, res, next) {
    Replicator.start(function(err) {
        if (err) { return next(err); }

        res.redirect('/');

    })
});

router.post('/stop', function(req, res, next) {
   Replicator.stop();
   res.redirect('/');
});

// Export the router instance to make it available from other files.
module.exports = router;
