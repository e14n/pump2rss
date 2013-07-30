# pump2rss

Translates pump.io-generated activity streams JSON into
activitystrea.ms-enhanced Atom.

Note that this is the source code for a Web-based service that runs at
https://pump2rss.com/ .

If you just want to share an RSS-ish feed of your pump.io activity
with people, or follow people on the pump network with your feed
reader, you can just use that service.

You only need to download and install this software if you want to run
a competitive/complementary service, or if your pump feeds are behind
a firewall and invisible to the public pump2rss service.

## License

Copyright 2011-2013, E14N https://e14n.com/

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Installation

0. You need nodejs to run this server.

1. Download the software to somewhere. I put it in /opt/pump2rss/ .

2. Install the libraries. This means going to the install dir and doing this:

    npm install
   
3. Add configuration data in /etc/pump2rss.json. This is a
   [JSON](http://www.json.org/) file consisting of a single object ("{}")
   with the following properties:
   
   * `port`: The port to listen on; an integer. Defaults to 4000. Use 80.
   * `hostname`: Hostname to use as the base of urls; default = 'localhost'.
   * `address`: The address to listen on; defaults to value of `hostname`.
   * `driver`: The [databank](https://npmjs.org/package/databank) driver to use.
     A string. Defaults to "disk", which is probably stupid.
   * `params`: Parameters for the databank driver; an object. Defaults to putting
     a disk databank in "/var/lib/pump2rss/", which is probably dumb.
   * `name`: A string; the name of your service. Defaults to "pump2rss", which you shouldn't
     use because it's mine.
   * `description`: Description of what the service does. Defaults to "Service to convert pump.io
     Activity Streams JSON into RSS"; probably not that bad.
   * `logfile`: a string. pump2rss uses [bunyan](https://npmjs.org/package/bunyan) for logging.
     This defines where to put the file. Defaults to `null`, meaning output log data to stdout.
   * `nologger`: Set to `true` to disable logging. Default `false`. Yeah, I know it's a double-negative.
   * `key`: String; a filename to use for your SSL key. Default `null`, meaning no SSL. If
     you turn this on, make sure to set the `port` to 443.
   * `cert`: String; a filename to use for your SSL cert. Default `null`. 

4. For whatever databank driver you're using, you have to install that driver. Do this:

    cd /opt/pump2rss/node_modules/databank/
    npm install databank-drivername
    
   ...where "drivername" is the name of the driver (like "redis" or "mongodb").
   
5. Start the app. You'll need to use sudo if you are listening on a port below 1024.

    sudo nodejs /opt/pump2rss/app.js
    
   Alternately, use the `forever` package to restart the app in case it crashes (which, hey, is pretty likely):
   
    sudo npm install -g forever
    sudo forever start /opt/pump2rss/app.js
    
## Bugs

Report bugs here: https://github.com/e14n/pump2rss/issues
