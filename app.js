// EXPRESS
// =============================================================================
var express = require('express'),
	app = express(),
	bodyParser = require('body-parser'),
	PORT = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// DEFINE ROUTES
// =============================================================================
app.use('/classifiers', require('./routes/classifiers'));

// START THE SERVER
// =============================================================================
app.listen(PORT);
console.log('Server running on port ' + PORT);