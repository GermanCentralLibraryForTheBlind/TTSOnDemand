const express = require('express'),
    bodyParser = require('body-parser'),
    cors = require('cors'),
    path = require('path');
const app = express();
const tmp = path.join(__dirname, '../../tmp');
const publicFolder = path.join(__dirname, '../../public');

app.use(cors());
console.log('tmp path: ' + tmp);
app.use('/static', express.static(tmp));
app.use('/public', express.static(publicFolder));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

require("./routes.js")(app);


app.listen(process.env.PORT || 3000, function () {
    console.log('express is running');
});