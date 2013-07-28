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
    pump2rss = require("../models/pump2rss");

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
    });
};
