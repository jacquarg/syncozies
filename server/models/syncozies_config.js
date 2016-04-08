var cozydb = require('cozydb');

var SynCoziesConfig = cozydb.getModel('SynCoziesConfig', {
    deviceName: { default: 'SynCozies', type: String },

    urlOfLocal: { default: '', type: String },
    devicePasswordOnLocal: { default: '', type: String },

    urlOfMain: { default: '', type: String },
    devicePasswordOnMain: { default: '', type: String },

});

module.exports = SynCoziesConfig;
