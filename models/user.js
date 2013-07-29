// user.js
//
// data object representing an user
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

var _ = require("underscore"),
    async = require("async"),
    wf = require("webfinger"),
    DatabankObject = require("databank").DatabankObject,
    pump2rss = require("./pump2rss"),
    Host = require("./host");

var User = DatabankObject.subClass("user");

User.schema = {
    pkey: "id",
    fields: ["content",
             "displayName",
             "image",
             "links",
             "objectType",
             "published",
             "summary",
             "updated",
             "url"]
};

User.ensureUser = function(webfinger, callback) {
    User.get(User.canonical(webfinger), function(err, user) {
        if (err && err.name == "NoSuchThingError") {
            User.discover(webfinger, callback);
        } else if (err) {
            callback(err, null);
        } else {
            callback(err, user);
        }
    });
};

User.discover = function(webfinger, callback) {

    var selfLink;

    async.waterfall([
        function(callback) {
            wf.webfinger(webfinger, "self", callback);
        },
        function(results, callback) {
            var selfies;
            if (!results || !results.links) {
                callback(new Error("No self link in Webfinger representation"), null);
                return;
            }
            selfies = _.filter(results.links, function(link) {
                return link.rel == "self";
            });
            if (selfies.length === 0) {
                callback(new Error("No self link in Webfinger representation"), null);
                return;
            }
            selfLink = selfies[0].href;
            Host.ensureHost(User.getHostname(webfinger), callback);
        },
        function(host, callback) {
            var oa = host.getOAuth();
            oa.get(selfLink, null, null, callback);
        },
        function(body, result, callback) {
            try {
                callback(null, JSON.parse(body));
            } catch (err) {
                callback(err);
            }
        }
    ], function(err, person) {
        if (err) {
            callback(err, null);
        } else {
            User.fromPerson(person, callback);
        }
    });
};

User.fromPerson = function(person, callback) {

    if (!person.links ||
        !person.links["activity-outbox"] ||
        !person.links["activity-outbox"].href) {
        callback(new Error("No activity inbox."));
        return;
    }

    User.create(person, callback);
};

User.getHostname = function(id) {
    var parts = id.split("@"),
        hostname = parts[1].toLowerCase();

    return hostname;
};

User.prototype.getHost = function(callback) {

    var user = this,
        hostname = User.getHostname(user.id);

    Host.get(hostname, callback);
};

User.canonical = function(id) {
    if (id.substr(0, 5) == "acct:") {
        return id;
    } else {
        return "acct:"+id;
    }
};

module.exports = User;
