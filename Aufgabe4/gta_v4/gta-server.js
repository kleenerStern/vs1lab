/**
 * Template für Übungsaufgabe VS1lab/Aufgabe3
 * Das Skript soll die Serverseite der gegebenen Client Komponenten im
 * Verzeichnisbaum implementieren. Dazu müssen die TODOs erledigt werden.
 */

/**
 * Definiere Modul Abhängigkeiten und erzeuge Express app.
 */

var http = require('http');
var url = require('url');
//var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var express = require('express');

var app;
app = express();
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

// Setze ejs als View Engine
app.set('view engine', 'ejs');

/**
 * Konfiguriere den Pfad für statische Dateien.
 * Teste das Ergebnis im Browser unter 'http://localhost:3000/'.
 */

app.use(express.static(__dirname + "/public"));

/**
 * Konstruktor für GeoTag Objekte.
 * GeoTag Objekte sollen min. alle Felder des 'tag-form' Formulars aufnehmen.
 */

function GeoTag(lat, long, geoName, tag) {
    this.lat = lat;
    this.long = long;
    this.geoName = geoName;
    this.tag = tag;

    var foundId = false;
    var id = Math.floor(Math.random() * 1000);
    while (foundId === false) {
        if (!geoTagModule.getById(id)) {
            foundId = true
        } else {
            id++;
        }
    }
    this.id = id;
    console.log('created new entry with id: ' + id)
}

/**
 * Modul für 'In-Memory'-Speicherung von GeoTags mit folgenden Komponenten:
 * - Array als Speicher für Geo Tags.
 * - Funktion zur Suche von Geo Tags in einem Radius um eine Koordinate.
 * - Funktion zur Suche von Geo Tags nach Suchbegriff.
 * - Funktion zum hinzufügen eines Geo Tags.
 * - Funktion zum Löschen eines Geo Tags.
 */

var geoTagModule = (function () {
    /*private member*/
    var geoTags = [];

    return {
        /**
         *
         * @param lat1
         * @param lon1
         * @param radius in km
         * @returns {*[]}
         */
        getByRadius: function (lat1, lon1, radius) {
            var returnTags = [];

            geoTags.forEach(function (tag) {
                // source: http://www.movable-type.co.uk/scripts/latlong.html

                var lat2 = tag.lat;
                var lon2 = tag.long;

                var R = 6371e3; // metres
                var phi1 = lat1 * Math.PI / 180; // φ, λ in radians
                var phi2 = lat2 * Math.PI / 180;
                var deltaphi = (lat2 - lat1) * Math.PI / 180;
                var deltalambda = (lon2 - lon1) * Math.PI / 180;

                var a = Math.sin(deltaphi / 2) * Math.sin(deltaphi / 2) +
                    Math.cos(phi1) * Math.cos(phi2) *
                    Math.sin(deltalambda / 2) * Math.sin(deltalambda / 2);
                var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                var d = R * c; // in metres
                console.log(d);

                if (d < radius * 1000) {
                    returnTags.push(tag);
                }
            })
            return returnTags;

        },
        getBySearchTerm: function (searchTerm) {
            var returnTags = [];
            geoTags.forEach(function (tag) {
                if (tag.geoName.includes(searchTerm)) {
                    returnTags.push(tag);
                }
            });
            return returnTags;
        },
        getById: function (id) {
            var returnTag;
            geoTags.forEach(function (tag) {
                if (tag.id == id) {
                    returnTag = tag;
                }
            });
            return returnTag;
        },
        addGeoTag: function (geoTag) {
            geoTags.push(geoTag);
        },
        putGeoTag: function (id, lat, long, name, tagName) {
            geoTags.forEach(function (tag) {
                if (tag.id == id) {
                    tag.lat = lat;
                    tag.long = long;
                    tag.geoName = name;
                    tag.tag = tagName;
                }
            });
        },
        deleteGeoTag: function (id) {
            geoTags.forEach(function (tag, i) {
                if (tag.id == id) {
                    geoTags.splice(i, 1);
                }
            })
        }
    };
})();

/**
 * Route mit Pfad '/' für HTTP 'GET' Requests.
 * (http://expressjs.com/de/4x/api.html#app.get.method)
 *
 * Requests enthalten keine Parameter
 *
 * Als Response wird das ejs-Template ohne Geo Tag Objekte gerendert.
 */

app.get('/', function (req, res) {
    res.render('gta', {
        taglist: [],
        coordinates: {}
    });
});

/**
 * Route mit Pfad '/tagging' für HTTP 'POST' Requests.
 * (http://expressjs.com/de/4x/api.html#app.post.method)
 *
 * Requests enthalten im Body die Felder des 'tag-form' Formulars.
 * (http://expressjs.com/de/4x/api.html#req.body)
 *
 * Mit den Formulardaten wird ein neuer Geo Tag erstellt und gespeichert.
 *
 * Als Response wird das ejs-Template mit Geo Tag Objekten gerendert.
 * Die Objekte liegen in einem Standard Radius um die Koordinate (lat, lon).
 */

app.post('/tagging', function (req, res) {
    geoTagModule.addGeoTag(new GeoTag(req.body['latitude'], req.body['longitude'], req.body['name'], req.body['hashtag']));

    res.render('gta', {
        taglist: geoTagModule.getByRadius(req.body['latitude'], req.body['longitude'], 300),
        coordinates: {
            lat: req.body['latitude'],
            lon: req.body['longitude']
        }
    });
});

/**
 * Route mit Pfad '/discovery' für HTTP 'POST' Requests.
 * (http://expressjs.com/de/4x/api.html#app.post.method)
 *
 * Requests enthalten im Body die Felder des 'filter-form' Formulars.
 * (http://expressjs.com/de/4x/api.html#req.body)
 *
 * Als Response wird das ejs-Template mit Geo Tag Objekten gerendert.
 * Die Objekte liegen in einem Standard Radius um die Koordinate (lat, lon).
 * Falls 'term' vorhanden ist, wird nach Suchwort gefiltert.
 */

// wie sinnvoll ist es, standardmäßig im umkreis des letzten eingetragenen wertes zu suchen?

app.post('/discovery', function (req, res) {
    var geoTags;
    if (req.body['searchterm']) {
        geoTags = geoTagModule.getBySearchTerm(req.body['searchterm']);
    } else {
        geoTags = geoTagModule.getByRadius(req.body['latitude'], req.body['longitude'], 300);
    }

    res.render('gta', {
        taglist: geoTags,
        coordinates: {
            lat: req.body['latitude'],
            lon: req.body['longitude']
        }
    });
});

/**
 * REST API
 */

// standard endpunkt um neue Elemente per POST hinzuzufügen
app.post('/geotags', function (req, res) {
    var geoTag = new GeoTag(req.body['latitude'], req.body['longitude'], req.body['name'], req.body['hashtag']);
    geoTagModule.addGeoTag(geoTag);
    // die url des eintrags in den location header schreiben
    res.setHeader('Location', req.headers.host + '/geotags/' + geoTag.id);
    // status 'created' returnen
    res.sendStatus(201);
});

// endpunkt um alle Elemente zurück zu bekommen
app.get('/geotags', function (req, res) {
    var query = url.parse(req.url, true).query;
    var geoTags = [];

    // wenn suchbegriff gegeben -> nach suchbegriff elemente beziehen
    // wenn nicht -> alle im aktuellen radius
    if (query['searchTerm']) {
        geoTags = geoTagModule.getBySearchTerm(query['searchTerm']);
    } else {
        geoTags = geoTagModule.getByRadius(query['latitude'], query['longitude'], 300);
    }

    // in der response gefundene elemente returnen
    res.json(geoTags);
});

// endpunkt für paginierte geotags
app.get('/geotagspaginated', function (req, res) {
    var query = url.parse(req.url, true).query;
    var geoTags = [];
    const entriesPerPage = 10;

    if (query['searchTerm']) {
        geoTags = geoTagModule.getBySearchTerm(query['searchTerm']);
    } else {
        geoTags = geoTagModule.getByRadius(query['latitude'], query['longitude'], 300);
    }

    // anfangs index für slice berechnen
    var fromEntry = (query['page']-1) * entriesPerPage;
    // end index für slice berechnen
    var toEntry = fromEntry + entriesPerPage;

    // zurückgabe objekt mit metadaten erstellen
    var returnObject = {
        entries:  geoTags.slice(fromEntry,toEntry),
        metadata:{
            'page':query['page'],
            'searchTerm': query['searchTerm'],
            'pageCount':Math.floor((geoTags.length - 1) / entriesPerPage) + 1
        }
    }

    res.json(returnObject);
});

// endpunkt um einzelnen Tag abzufragen
app.get('/geoTags/:id', function (req, res) {
    res.json(geoTagModule.getById(req.params.id));
});

// endpunkt um einzelnen Tag zu bearbeiten
app.put('/geoTags/:id', function (req, res) {
    geoTagModule.putGeoTag(req.params.id, req.body['latitude'], req.body['longitude'], req.body['name'], req.body['hashtag']);

    res.sendStatus(200);
});

// endpunkt um einzelnen tag zu löschen
app.delete('/geoTags/:id', function (req, res) {
    geoTagModule.deleteGeoTag(req.params.id);

    res.sendStatus(200);
});


/**
 * Setze Port und speichere in Express.
 */

var port = 3000;
app.set('port', port);

/**
 * Erstelle HTTP Server
 */

var server = http.createServer(app);

/**
 * Horche auf dem Port an allen Netzwerk-Interfaces
 */

server.listen(port);
