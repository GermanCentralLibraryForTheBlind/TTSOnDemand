const express = require('express'),
    bodyParser = require('body-parser'),
    cors = require('cors'),
    path = require('path'),
    fs = require('fs'),
    morgan = require('morgan');

process.env['NO_PROXY'] = 'localhost';

const app = express();
const tmp = path.join(__dirname, '../../tmp');
const publicFolder = path.join(__dirname, '../../public');

app.use(cors());
//console.log('tmp path: ' + tmp);
app.use('/static', express.static(tmp));
app.use('/public', express.static(publicFolder));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


// access logger
const accessLogStream = fs.createWriteStream(__dirname + '/../../logs/access.log', {flags: 'a'});
app.use(morgan('combined', {stream: accessLogStream}))


require("./routes.js")(app);


const server = app.listen(process.env.PORT || 3000, function () {
    const host = server.address().address;
    const  port = server.address().port;
    console.log('[INFO] Service is listening at http://%s:%s', host, port);
});

