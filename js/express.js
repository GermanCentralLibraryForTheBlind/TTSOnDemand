/**
 * Created by alan on 10.08.16.
 */
var express = require('express');
var app = express();

app.use('/static', express.static(__dirname + '/tmp'));

app.listen(process.env.PORT || 3000);