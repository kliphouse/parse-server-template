'use strict';

const ParseServer = require('parse-server').ParseServer;
const appRoot = require('app-root-dir').get();
const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');

const bodyParser = require('body-parser');
const constants = require('./util/constants');

const cookieParser = require('cookie-parser');
const favicon = require('serve-favicon');
const logger = require('morgan');
const parseDashboard = require('parse-dashboard');

const databaseUri = process.env.DATABASE_URI || process.env.DATABASE_URL || process.env.MONGODB_URI;

if (!databaseUri) {
    throw 'Database not specified';
}

// Parse-Server config
const api = new ParseServer({
    databaseURI: databaseUri,
    cloud: path.join(appRoot, process.env.CLOUD_CODE_MAIN),
    appId: process.env.APP_ID,
    masterKey: process.env.MASTER_KEY,
    serverURL: process.env.SERVER_URL,
    fileKey: process.env.FILE_KEY,
    appName: process.env.APP_NAME,
    publicServerURL: process.env.SERVER_URL
});

// Parse-Dashboard config
const dash = parseDashboard({
    'apps': [
        {
            'serverURL': process.env.SERVER_URL,
            'publicServerURL': process.env.SERVER_URL,
            'appId': process.env.APP_ID,
            'masterKey': process.env.MASTER_KEY,
            'fileKey': process.env.FILE_KEY,
            'appName': process.env.APP_NAME,
            'appNameForURL': process.env.APP_NAME,
            'production': true
        }
    ],
    'users': [
        {
            "user": process.env.ADMIN_USERNAME,
            "pass": process.env.ADMIN_PASSWORD
        }
    ],
    'trustProxy': true
});

let app = express();

app.use('/*', function (req, res, next) {
    let reqType = req.headers['x-forwarded-proto'];

    if (reqType !== 'https' && process.env.NODE_ENV !== constants.ENV.LOCAL) {
        return res.redirect('https://' + req.headers.host + req.url);
    }

    return next();
});

app.use('/dash', dash);

const mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

app.use('/public', express.static(path.join(__dirname, '/public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

let loggerFormat = '';

if (!process.env.ENV || process.env.ENV === constants.ENV.DEV) {
    loggerFormat = 'dev';
} else if (process.env.ENV === constants.ENV.QA) {
    loggerFormat = 'common';
} else {
    loggerFormat = 'tiny';
}

app.use(logger(loggerFormat));

app.use(bodyParser.json({type: 'application/json'}));
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function (req, res) {
    res.redirect('/dash');
});

const port = process.env.PORT || 1337;

let server;

if (process.env.NODE_ENV === constants.ENV.LOCAL) {
    server = http.createServer(app);
} else {
    server = https.createServer(app);
}

server.listen(port, function () {
    console.log((process.env.APP_NAME || 'parse-server') + ' running on port ' + port + '.');
});

app.use(cookieParser());

module.exports = app;
