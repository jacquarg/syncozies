
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');


/*
    Configuration section.
*/
app.use(bodyParser.urlencoded());
app.use(morgan(":date[iso] :method :url :status :response-time ms"));
app.use(express.static('client'));

app.set('views', './server/views')
app.set('view engine', 'jade');
/*
    Define routes and their handler.
*/

app.use(require('./server/controllers/index'));
app.use(require('./server/controllers/config_server'));


/*
    Start the HTTP server.
*/
var server = app.listen(9240, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Cozy tutorial app listening at http://%s:%s', host, port);
});
