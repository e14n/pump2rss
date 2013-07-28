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
    uuid = require("node-uuid"),
    DatabankObject = require("databank").DatabankObject,
    pump2rss = require("./pump2rss"),
    Host = require("./host");

var User = DatabankObject.subClass("user");

User.schema = {
    pkey: "id",
    fields: ["name",
             "token",
             "secret",
             "inbox",
             "outbox",
             "followers",
             "created",
             "updated"]
};

User.fromPerson = function(person, token, secret, callback) {

    var id = person.id,
        user,
        bank = User.bank();

    if (id.substr(0, 5) == "acct:") {
        id = id.substr(5);
    }

    if (!person.links ||
        !person.links["activity-inbox"] ||
        !person.links["activity-inbox"].href) {
        callback(new Error("No activity inbox."));
        return;
    }

    if (!person.links ||
        !person.links["activity-outbox"] ||
        !person.links["activity-outbox"].href) {
        callback(new Error("No activity inbox."));
        return;
    }

    if (!person.followers ||
        !person.followers.url) {
        callback(new Error("No followers."));
        return;
    }

    async.waterfall([
        function(callback) {
            User.create({id: id,
                         name: person.displayName,
                         homepage: person.url,
                         token: token,
                         secret: secret,
                         created: Date.now(),
                         updated: Date.now(),
                         inbox: person.links["activity-inbox"].href,
                         outbox: person.links["activity-outbox"].href,
                         followers: person.followers.url},
                        callback);
        }
    ], callback);
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

module.exports = User;
