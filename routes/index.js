// index.js
//
// Most of the routes in the application
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

var wf = require("webfinger"),
    async = require("async"),
    _ = require("underscore"),
    uuid = require("node-uuid"),
    User = require("../models/user"),
    Host = require("../models/host"),
    RequestToken = require("../models/requesttoken"),
    RememberMe = require("../models/rememberme"),
    ActivityObject = require("../models/activityobject"),
    pump2rss = require("../models/ih8it");

exports.hostmeta = function(req, res) {
    res.json({
        links: [
            {
                rel: "dialback",
                href: pump2rss.url("/dialback")
            }
        ]
    });
};

exports.index = function(req, res, next) {
    res.render('index', { title: "Welcome" });
};

exports.showFeed = function(req, res, next) {

    var user = req.user,
        src = req.body.src,
        url = req.body.url;

    async.waterfall([
        function(callback) {
            ActivityObject.ensure(url, callback);
        },
        function(aobj, callback) {
            var now = new Date();
            user.postActivity({
                verb: req.app.config.verb,
                object: aobj,
                published: now.toISOString()
            }, callback);
        }
    ], function(err, posted) {
        if (err) {
            next(err);
        } else {
            if (src == "button") {
                res.redirect(url, 303);
            } else {
                // XXX: show indicator that h8 happened
                res.redirect("/", 303);
            }
        }
    });
};
