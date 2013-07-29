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

var validator = require("validator"),
    async = require("async"),
    _ = require("underscore"),
    User = require("../models/user"),
    Host = require("../models/host"),
    pump2rss = require("../models/pump2rss"),
    sanitize = validator.sanitize;

var simplify = function(id) {
    if (id.substr(0, 5) == 'acct:') {
        return id.substr(5);
    } else {
        return id;
    }
};
        
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

exports.redirectFeed = function(req, res, next) {
    var webfinger = req.body.webfinger;
    res.redirect(pump2rss.url("/feed/"+simplify(webfinger)+'.atom'), 303);
};

exports.showFeed = function(req, res, next) {

    var user = req.user;

    async.waterfall([
        function(callback) {
            user.getHost(callback);
        },
        function(host, callback) {
            var oa = host.getOAuth();
            // XXX: caching
            oa.get(user.links["activity-outbox"].href, null, null, callback);
        },
        function(body, result, callback) {
            try {
                callback(null, JSON.parse(body));
            } catch (err) {
                callback(err);
            }
        }
    ], function(err, feed) {
        if (err) {
            next(err);
        } else {
            feedAsAtom(feed, user, res);
        }
    });
};

var atomFeedStart = function(res, user) {

    var url = pump2rss.url("/feed/"+ simplify(user.id) + '.atom');

    res.write('<?xml version="1.0" encoding="utf-8"?>\n');
    res.write('<feed xmlns="http://www.w3.org/2005/Atom" xmlns:activity="http://activitystrea.ms/spec/1.0/">\n');
    res.write('<title>'+user.displayName+'\'s activity stream</title>\n');
    res.write('<link href="'+ url + '"/>\n');
    res.write('<updated>'+(new Date()).toISOString()+'</updated>\n');
    res.write('<id>'+url+'</id>\n');
};

var userAsAuthor = function(res, user) {
    activityObject(res, user, user, 'author');
};

var activityAsEntry = function(res, user, item) {

    if (item.verb == "post") {
        activityAsImpliedEntry(res, user, item);
    } else {
        activityAsFullEntry(res, user, item);
    }
};

var activityAsImpliedEntry = function(res, user, item) {
    activityObject(res, user, item.object, 'entry');
};

var activityObject = function(res, user, obj, tag) {

    var stripTags = function(str) {
            return str.replace(/<(?:.|\n)*?>/gm, '');
        };

    res.write('<'+tag+'>\n');

    if (tag == 'author') {
        res.write('<uri>'+obj.id+'</uri>\n');
    } else {
        res.write('<id>'+obj.id+'</id>\n');
    }

    if (tag == 'author') {
        res.write('<name>'+obj.displayName+'</name>\n');
    } else {
        res.write('<title>'+((obj.displayName) ? obj.displayName : '')+'</title>\n');
    }

    if (obj.published) {
        res.write('<published>'+obj.published+'</published>\n');
    }

    if (obj.updated) {
        res.write('<updated>'+obj.updated+'</updated>\n');
    }

    res.write('<activity:object-type>'+obj.objectType+'</activity:object-type>\n');

    if (obj.author && obj.author.id != user.id) {
        userAsAuthor(res, obj.author);
    }

    if (obj.summary) {
        res.write('<summary>'+stripTags(sanitize(obj.summary).entityDecode())+'</summary>\n');
    }

    if (obj.content) {
        res.write('<content type="html">'+sanitize(obj.content).escape()+'</content>\n');
    }

    if (obj.image) {
        res.write('<link rel="preview" href="'+obj.image.url+'" />\n');
    }

    if (obj.url) {
        res.write('<link rel="alternate" type="text/html" href="'+obj.url+'" />\n');
    }

    // XXX: stream
    // XXX: fullImage

    res.write('</'+tag+'>\n');
};

var activityAsFullEntry = function(res, user, item) {

    var stripTags = function(str) {
            return str.replace(/<(?:.|\n)*?>/gm, '');
        };

    res.write('<entry>\n');

    res.write('<id>'+item.id+'</id>\n');

    res.write('<published>'+item.published+'</published>\n');

    res.write('<title>'+((item.displayName) ? item.displayName : '')+'</title>\n');

    res.write('<activity:verb>'+item.verb+'</activity:verb>\n');

    if (item.summary) {
        res.write('<summary>'+stripTags(sanitize(item.summary).entityDecode())+'</summary>\n');
    }

    if (item.content) {
        res.write('<content type="html">'+sanitize(item.content).escape()+'</content>\n');
    }

    if (item.object) {
        activityObject(res, user, item.object, 'activity:object');
    }

    if (item.target) {
        activityObject(res, user, item.object, 'activity:target');
    }

    if (item.image) {
        res.write('<link rel="preview" href="'+item.image.url+'" />\n');
    }

    if (item.url) {
        res.write('<link rel="alternate" type="text/html" href="'+item.url+'" />\n');
    }

    res.write('</entry>\n');
};

var feedAsAtom = function(feed, user, res) {
    res.header("Content-Type", "application/atom+xml");
    atomFeedStart(res, user);
    userAsAuthor(res, user);
    _.each(feed.items, function(item) {
        activityAsEntry(res, user, item);
    });
    res.write("</feed>\n");
    res.end();
};
