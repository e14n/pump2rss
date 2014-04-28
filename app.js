// app.js
//
// main function for pump2rss
//
// Copyright 2013, E14N https://e14n.com/
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var fs = require("fs"),
    async = require("async"),
    path = require("path"),
    _ = require("underscore"),
    express = require('express'),
    DialbackClient = require("dialback-client"),
    Logger = require("bunyan"),
    routes = require('./routes'),
    databank = require("databank"),
    uuid = require("node-uuid"),
    Databank = databank.Databank,
    DatabankObject = databank.DatabankObject,
    User = require("./models/user"),
    Host = require("./models/host"),
    pump2rss = require("./models/pump2rss"),
    config,
    defaults = {
        port: 4000,
        address: null,
        hostname: "localhost",
        driver: "disk",
        params: {dir: "/var/lib/pump2rss/"},
        name: "pump2rss",
        description: "Service to convert pump.io Activity Streams JSON into RSS",
        logfile: null,
        nologger: false,
        key: null,
        cert: null
    },
    log,
    logParams = {
        name: "pump2rss",
        serializers: {
            req: Logger.stdSerializers.req,
            res: Logger.stdSerializers.res
        }
    };

if (fs.existsSync("/etc/pump2rss.json")) {
    config = _.defaults(JSON.parse(fs.readFileSync("/etc/pump2rss.json")),
                        defaults);
} else {
    config = defaults;
}

if (!config.address) {
    config.address = config.hostname;
}

if (config.logfile) {
    logParams.streams = [{path: config.logfile}];
} else if (config.nologger) {
    logParams.streams = [{path: "/dev/null"}];
} else {
    logParams.streams = [{stream: process.stderr}];
}

log = new Logger(logParams);

log.info("Initializing");

// Configure the service object

log.info({name: config.name, 
          description: config.description, 
          hostname: config.hostname},
         "Initializing pump2rss object");

pump2rss.name        = config.name;
pump2rss.description = config.description;
pump2rss.hostname    = config.hostname;

pump2rss.protocol = (config.key) ? "https" : "http";

if (!config.params) {
    if (config.driver == "disk") {
        config.params = {dir: "/var/lib/pump2rss/"};
    } else {
        config.params = {};
    }
}

// Define the database schema

if (!config.params.schema) {
    config.params.schema = {};
}

_.extend(config.params.schema, DialbackClient.schema);

// Now, our stuff

_.each([Host, User], function(Cls) {
    config.params.schema[Cls.type] = Cls.schema;
});

var db = Databank.get(config.driver, config.params);

async.waterfall([
    function(callback) {
        log.info({driver: config.driver, params: config.params}, "Connecting to DB");
        db.connect({}, callback);
    },
    function(callback) {

        var app,
            bounce,
            client,
            requestLogger = function(log) {
                return function(req, res, next) {
                    var weblog = log.child({"req_id": uuid.v4(), component: "web"});
                    var end = res.end;
                    req.log = weblog;
                    res.end = function(chunk, encoding) {
                        var rec;
                        res.end = end;
                        res.end(chunk, encoding);
                        rec = {req: req, res: res};
                        weblog.info(rec);
                    };
                    next();
                };
            };

        // Set global databank info

        DatabankObject.bank = db;

        if (config.key) {

            log.info("Using SSL");

            app = express.createServer({key: fs.readFileSync(config.key),
                                        cert: fs.readFileSync(config.cert)});
            bounce = express.createServer(function(req, res, next) {
                var host = req.header('Host');
                res.redirect('https://'+host+req.url, 301);
            });

        } else {

            log.info("Not using SSL");

            app = express.createServer();
        }

        // Configuration

        log.info("Configuring app");

        app.configure(function(){
            var serverVersion = 'pump2rss/'+pump2rss.version + ' express/'+express.version + ' node.js/'+process.version,
                versionStamp = function(req, res, next) {
                    res.setHeader('Server', serverVersion);
                    next();
                },
                appObject = function(req, res, next) {
                    req.pump2rss = pump2rss;
                    res.local("pump2rss", pump2rss);
                    next();
                };

            app.set('views', __dirname + '/views');
            app.set('view engine', 'utml');
            app.use(requestLogger(log));
            app.use(versionStamp);
            app.use(appObject);
            app.use(express.bodyParser());
            app.use(app.router);
            app.use(express.static(__dirname + '/public'));
        });

        app.configure('development', function(){
            app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
        });

        app.configure('production', function(){
            app.use(express.errorHandler());
        });

        // middleware

        var reqUser = function(req, res, next) {

            var webfinger = req.params.webfinger;

            User.ensureUser(webfinger, function(err, user) {
                if (err) {
                    next(err);
                } else {
                    req.user = user;
                    next();
                }
            });
        };

        // Routes

        log.info("Initializing routes");

        app.get('/', routes.index);
        app.post('/feed', routes.redirectFeed);
        app.get('/feed/:webfinger.atom', reqUser, routes.showFeed);
        app.get('/.well-known/host-meta.json', routes.hostmeta);

        // Create a dialback client

        log.info("Initializing dialback client");

        client = new DialbackClient({
            hostname: config.hostname,
            app: app,
            bank: db,
            userAgent: pump2rss.userAgent()
        });

        // Configure this global object

        Host.dialbackClient = client;

        // Let Web stuff get to config

        app.config = config;

        // For handling errors

        app.log = function(obj) {
            if (obj instanceof Error) {
                log.error(obj);
            } else {
                log.info(obj);
            }
        };

        // Start the app

        log.info({port: config.port, address: config.address}, "Starting app listener");

        app.listen(config.port, config.address, callback);

        // Start the bouncer

        if (config.bounce) {
            log.info({port: 80, address: config.address}, "Starting bounce listener");
            bounce.listen(80, config.address);
        }

    }], function(err) {
        if (err) {
            log.error(err);
        } else {
            console.log("Express server listening on address %s port %d", config.address, config.port);
        }
});    
