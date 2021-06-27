/* Dieses Skript wird ausgeführt, wenn der Browser index.html lädt. */

// Befehle werden sequenziell abgearbeitet ...

/**
 * "console.log" schreibt auf die Konsole des Browsers
 * Das Konsolenfenster muss im Browser explizit geöffnet werden.
 */
console.log("The script is going to start...");

// Es folgen einige Deklarationen, die aber noch nicht ausgeführt werden ...

// Hier wird die verwendete API für Geolocations gewählt
// Die folgende Deklaration ist ein 'Mockup', das immer funktioniert und eine fixe Position liefert.
GEOLOCATIONAPI = {
    getCurrentPosition: function (onsuccess) {
        onsuccess({
            "coords": {
                "latitude": 49.013790,
                "longitude": 8.390071,
                "altitude": null,
                "accuracy": 39,
                "altitudeAccuracy": null,
                "heading": null,
                "speed": null
            },
            "timestamp": 1540282332239
        });
    }
};

// Die echte API ist diese.
// Falls es damit Probleme gibt, kommentieren Sie die Zeile aus.
GEOLOCATIONAPI = navigator.geolocation;

/**
 * GeoTagApp Locator Modul
 */
var gtaLocator = (function GtaLocator(geoLocationApi) {

    // Private Member

    /**
     * Funktion spricht Geolocation API an.
     * Bei Erfolg Callback 'onsuccess' mit Position.
     * Bei Fehler Callback 'onerror' mit Meldung.
     * Callback Funktionen als Parameter übergeben.
     */
    var tryLocate = function (onsuccess, onerror) {
        if (geoLocationApi) {
            geoLocationApi.getCurrentPosition(onsuccess, function (error) {
                var msg;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        msg = "User denied the request for Geolocation.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        msg = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        msg = "The request to get user location timed out.";
                        break;
                    case error.UNKNOWN_ERROR:
                        msg = "An unknown error occurred.";
                        break;
                }
                onerror(msg);
            });
        } else {
            onerror("Geolocation is not supported by this browser.");
        }
    };

    // Auslesen Breitengrad aus der Position
    var getLatitude = function (position) {
        return position.coords.latitude;
    };

    // Auslesen Längengrad aus Position
    var getLongitude = function (position) {
        return position.coords.longitude;
    };

    // Hier API Key eintragen
    var apiKey = "vjiAVHIO5ZM89JHUlUAvS5G0W5DYhDBK";

    /**
     * Funktion erzeugt eine URL, die auf die Karte verweist.
     * Falls die Karte geladen werden soll, muss oben ein API Key angegeben
     * sein.
     *
     * lat, lon : aktuelle Koordinaten (hier zentriert die Karte)
     * tags : Array mit Geotag Objekten, das auch leer bleiben kann
     * zoom: Zoomfaktor der Karte
     */
    var getLocationMapSrc = function (lat, lon, tags, zoom) {
        zoom = typeof zoom !== 'undefined' ? zoom : 10;

        if (apiKey === "YOUR_API_KEY_HERE") {
            console.log("No API key provided.");
            return "images/mapview.jpg";
        }

        var tagList = "&pois=You," + lat + "," + lon;
        if (tags !== undefined) tags.forEach(function (tag) {
            tagList += "|" + tag.geoName + "," + tag.lat + "," + tag.long;
        });

        var urlString = "https://www.mapquestapi.com/staticmap/v4/getmap?key=" +
            apiKey + "&size=600,400&zoom=" + zoom + "&center=" + lat + "," + lon + "&" + tagList;

        console.log("Generated Maps Url: " + urlString);
        return urlString;
    };

    return { // Start öffentlicher Teil des Moduls ...

        // Public Member

        readme: "Dieses Objekt enthält 'öffentliche' Teile des Moduls.",

        updateLocation: function () {
            var taglist = JSON.parse(jQuery('[data-tags]').attr('data-tags'));
            var lat = jQuery('input[name="latitude"]').val();
            var long = jQuery('input[name="longitude"]').val();
            if (lat == '' && long == '') {
                tryLocate(function (position) {
                        jQuery('input[name="latitude"]').val(getLatitude(position));
                        jQuery('input[name="longitude"]').val(getLongitude(position));

                        jQuery('#result-img').attr(
                            'src', getLocationMapSrc(getLatitude(position), getLongitude(position), taglist)
                        );
                    },
                    function (message) {
                        alert('Something went wrong.. Message: :' + message);
                    })
            } else {
                jQuery('#result-img').attr('src', getLocationMapSrc(lat, long, taglist));
            }
        }

    }; // ... Ende öffentlicher Teil
})(GEOLOCATIONAPI);

/**
 * $(function(){...}) wartet, bis die Seite komplett geladen wurde. Dann wird die
 * angegebene Funktion aufgerufen. An dieser Stelle beginnt die eigentliche Arbeit
 * des Skripts.
 */
$(function () {
    gtaLocator.updateLocation();


    // filter formular submit listener
    jQuery('#filter-form').on('submit', function (event) {
        // standardverhalten aufhalten
        event.preventDefault();
        var ajax = new XMLHttpRequest();
        // formular werte als array speichern
        var formData = $(event.target).serializeArray();

        // url für ajax zusammensetzen aus: searchterm, lat, long. Seite 1 Anfordern, da neue Suche
        ajax.open('GET', '/geoTagspaginated?searchTerm=' + formData[0]['value']
            + '&latitude=' + formData[1]['value'] + '&longitude=' + formData[2]['value'] + '&page=1', true);

        ajax.send(null);

        ajax.onreadystatechange = function () {
            if (ajax.readyState == 4) {
                // das JSON an die Funktion übergeben welche die Tags & Map aktualisiert
                updateTagListAndMap(JSON.parse(ajax.responseText));
            }
        }
    })

    // tagging event submit listener
    jQuery('#tag-form').on('submit', function (event) {
        // standardverhalten verhindern
        event.preventDefault();
        var ajax = new XMLHttpRequest();
        // url für post setzen
        ajax.open('POST', '/geotags', true);
        // im header kommunizieren, dass wir JSON übertragen
        ajax.setRequestHeader('Content-Type', 'application/json');

        // formulardaten in array speichern
        var arrayData = $(event.target).serializeArray();

        // message body aus formular feldern erstellen
        var messageBody = {
            'latitude': arrayData[0]['value'],
            'longitude': arrayData[1]['value'],
            'name': arrayData[2]['value'],
            'hashtag': arrayData[3]['value']
        }

        ajax.send(JSON.stringify(messageBody));

        // warten bis ajax anfrage fertig
        ajax.onreadystatechange = function () {
            if (ajax.readyState == 4) {
                /**
                 * neue ajax abfrage nach geoTags
                 * warum?
                 *      -> die aktuell angezeigten geoTags sollen standardmäßig im Radius der zuletzt
                 *         eingegebenen/aktuellen Koordinate liegen (war bei /tagging auch so)
                 *      -> bei POST sollte nicht das gesamte Result set returned werden
                 *         das verhalten unserer app sollte nichts mit unserer api zu tun haben
                 */
                ajax = new XMLHttpRequest();
                ajax.open('GET', '/geoTagspaginated?searchTerm=&latitude=' + arrayData[0]['value'] + '&longitude='
                    + arrayData[1]['value'] + '&page=1', false);

                ajax.send(null);

                // ajax ergebnis an funktion übergeben die tagliste & map aktualisiert
                updateTagListAndMap(JSON.parse(ajax.responseText));
            }
        }
    })

    function updateTagListAndMap(response) {
        // tags in data-tags der map schreiben
        jQuery('[data-tags]').attr('data-tags', JSON.stringify(response['entries']));

        // alle vorherigen tags entfernen
        jQuery('ul#results li').remove();

        // neue tags generieren
        response['entries'].forEach(function (elem) {
            jQuery('ul#results')
                .append('<li class="transition-background">' + elem['geoName']
                    + ' ( ' + elem['lat'] + ',' + elem['long'] + ') ' + elem['tag'] + ' </li>');
        })
        // map neu generieren lassen
        gtaLocator.updateLocation();

        // alte pagination entfernen
        jQuery('.page-link').remove();
        // neue pagination (aus metadaten der response) erstellen
        for (var i = 1; i <= response['metadata']['pageCount']; i++) {
            jQuery('#pagination-container').append('<div class="page-link" data-searchTerm="'+response['metadata']['searchTerm']+'" data-page="' + i + '">' + i + '</div>')
        }
        // vorherige seite berechnen & button einfügen
        var prevPage = parseInt(response['metadata']['page']) -1;
        if(prevPage<=0){
            prevPage++;
        }
        // seite danach berechnen & button einfügen
        var nextPage = parseInt(response['metadata']['page']) +1;
        if(nextPage > response['metadata']['pageCount']){
            nextPage--;
        }

        jQuery('#pagination-container').append('<div class="page-link" data-searchTerm="'+response['metadata']['searchTerm']+'"  data-page="' + nextPage + '"> >> </div>')
        jQuery('#pagination-container').prepend('<div class="page-link" data-searchTerm="'+response['metadata']['searchTerm']+'"  data-page="' + prevPage + '"> << </div>')

        // klick listener auf pagination elemente - Seite wird mit übergeben
        jQuery('.page-link').on('click', function (event) {
            var ajax = new XMLHttpRequest();
            // url erstellen für seite welche im data-page tag hinterlegt ist
            ajax.open('GET', '/geoTagspaginated?latitude='
                + jQuery('input[name="latitude"]').val()
                + '&longitude=' + jQuery('input[name="longitude"]').val()
                + '&searchTerm=' + jQuery(event.target).attr('data-searchterm')
                + '&page=' + jQuery(event.target).attr('data-page'), false);

            ajax.send(null);

            // funktion aufrufen welche tags & map aktualisiert
            updateTagListAndMap(JSON.parse(ajax.responseText));
        });
    }
});
