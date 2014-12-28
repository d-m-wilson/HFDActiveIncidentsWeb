// HFD Active Incidents
// Copyright © 2014 David M. Wilson
// https://twitter.com/dmwilson_dev
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

var initApp;
var google = google || {};

(function() {

    var map;
    var mapDiv;
    var infoWindow;
    var incidents;
    var markers;
    var jqMapDiv = null;
    var jqLoadingMsg = null;

    var webServiceUrl = 'http://backend-server/incidentsapi/api/ActiveIncident';

    var defaultMapIconImage = 'img/red_MarkerBlank.png';

    function initialize() {

        var mapOptions = {
            zoom: 10,
            center: {lat: 29.772315, lng: -95.37207}
        };

        mapDiv = document.getElementById( 'map-canvas' );
        map = new google.maps.Map( mapDiv, mapOptions );

        jqLoadingMsg = $( '#map-data-loading' );
        jqMapDiv = $( '#map-canvas' );

        onWindowResize();
        showLoadingMessage();

        infoWindow = infoWindow || new google.maps.InfoWindow({
            content: '<div id="infoWindowContent"></div>'
        });

        fetchIncidents();
    }

    function fetchIncidents() {

        showLoadingMessage();

        $.getJSON(webServiceUrl, function (json){

            incidents = json;
            deleteAllMarkers();
            processAndDisplayIncidents();
            setTimeout( hideLoadingMessage, 100 );
            setTimeout( fetchIncidents, 300000 );
        });
    }

    function deleteAllMarkers() {

        markers = markers || [];

        if (markers.length > 0) {
            for (var i = 0; i < markers.length; i++) {
                markers[i].setMap( null );
            }
            markers.length = 0;
        }
    }

    function processAndDisplayIncidents() {

        incidents = incidents || [];

        incidents = incidents.sort(function(a,b) {return a.IncidentType.Id - b.IncidentType.Id;});

        for (var i = 0; i < incidents.length; i++) {

            var incident = incidents[i];
            var latLng = new google.maps.LatLng( incident.Latitude, incident.Longitude );
            var marker = new google.maps.Marker({
                position: latLng,
                title: incident.IncidentType.Name,
                map: map,
                optimized: false
            });

            setMarkerIconAndZIndex( marker, incident );
            markers.push( marker );
            bindInfoWindow( marker, map, infoWindow, getInfoWindowContent( incident ) );
        }
    }

    function bindInfoWindow( marker, map, infowindow, html ) {

        google.maps.event.addListener( marker, 'click', function () {

            infowindow.setContent( html );
            infowindow.open( map, this );
        });
    }

    function formatDate( date ) {

        if ( date === undefined || date === '' ) {
            return '';
        }
        var dateObj = new Date( date );
        return dateObj.toLocaleString();
    }

    function getInfoWindowContent( src ) {

        var srcUnits;

        if ( src === undefined || src === null ) {
            return '';
        }

        if ( src.Units !== undefined && src.Units !== '' ) {
            srcUnits = src.Units.split(';').join(', ');
        } else {
            srcUnits = '';
        }

        var dst = '<div id="infoWindowContent">' +
            '<span class="iw-text-label">Agency: </span> ' + src.IncidentType.Agency.Name + '<br />' +
            '<span class="iw-text-label">Type:</span> ' + src.IncidentType.Name + '<br />' +
            '<span class="iw-text-label">Address: </span> ' + src.Address + '<br />' +
            '<span class="iw-text-label">Cross Street: </span> ' + src.CrossStreet + '<br />' +
            '<span class="iw-text-label">KeyMap: </span> ' + src.KeyMap + '<br />';

        if ( src.AlarmLevel !== undefined && src.AlarmLevel > 0 ) {
            dst = dst + '<span class="iw-text-label">Alarm Level: </span>' + src.AlarmLevel + '<br />';
        }

        dst = dst +
            '<span class="iw-text-label"># Units: </span> ' + src.NumberOfUnits + '<br />' +
            '<span class="iw-text-label">Units: </span> ' + srcUnits + '<br />' +
            '<span class="iw-text-label">Call Opened: </span> ' + formatDate(src.CallTimeOpened) + '<br />' +
            '<span class="iw-text-label">Retrieved: </span> ' + formatDate(src.RetrievedDT) + '<br />' +
            '<span class="iw-text-label">Updated: </span> ' + formatDate(src.LastSeenDT) + '<br />' +
            '</div>';
        return dst;
    }

    function onWindowResize() {
        var viewportHeight = $(window).height();
        var headerHeight = $('#nav-bar-header').height();
        var mapHeight = Math.ceil((viewportHeight - headerHeight) * 0.79);

        if (jqMapDiv !== null) {
            jqMapDiv.height(mapHeight);
        }

        positionLoadingMessage();

        var mapCenter = map.getCenter();
        google.maps.event.trigger(map, 'resize');
        map.setCenter(mapCenter);
    }

    function positionLoadingMessage() {
        if (jqMapDiv !== null && jqLoadingMsg !== null) {
            var msgTop = Math.floor(jqMapDiv.position().top + (jqMapDiv.height() / 2) - (jqLoadingMsg.height() / 2));
            var msgLeft = Math.floor(jqMapDiv.position().left + (jqMapDiv.width() / 2) - (jqLoadingMsg.width() / 2));
            jqLoadingMsg.css({ top: msgTop, left: msgLeft, position:'absolute' });
        }
    }

    function showLoadingMessage() {
        if (jqLoadingMsg !== null && (! jqLoadingMsg.is(':visible'))) {
            jqLoadingMsg.show();
        }
    }

    function hideLoadingMessage() {
        if (jqLoadingMsg !== null && jqLoadingMsg.is(':visible')) {
            jqLoadingMsg.hide();
        }
    }

    function setMarkerIconAndZIndex(marker, incident) {
        var zIndex = 2;

        if (incident === undefined || incident.IncidentType === undefined) {
            return;
        }

        if (!String.prototype.contains) {
            String.prototype.contains = function () {
                return String.prototype.indexOf.apply(this, arguments) !== -1;
            };
        }

        var itype = incident.IncidentType.Name.toUpperCase();
        var typeImage = String.empty;

        if (itype.contains('EMS') || itype.contains('CHECK PATIENT')) {
            typeImage = 'img/paleblue_MarkerE.png';
            zIndex = 1;
        }
        else if (itype.contains('FIRE') && (itype != 'CHECK FOR FIRE')) {
            typeImage = 'img/red_MarkerF.png';
        }
        else if (itype.contains('MOTOR VEHICLE')
            || itype.contains('MOTORCYCLE')
            || itype.contains('PEDESTRIAN')) {
            typeImage = 'img/yellow_MarkerA.png';
        }
        else if (itype.contains('ELEVATOR'))
        {
            typeImage = 'img/yellow_MarkerE.png';
        }
        else if (itype.contains('ALARM')
            || itype.contains('SMOKE'))
        {
            typeImage = 'img/orange_MarkerA.png';
        }
        else if (itype.contains('CHEMICAL LEAK')
            || itype.contains('CHEMICAL SPILL')
            || itype.contains('HAZMAT'))
        {
            typeImage = 'img/green_MarkerH.png';
        }
        else {
            typeImage = defaultMapIconImage;
        }

        if (typeImage == String.empty) {
            typeImage = defaultMapIconImage;
        }

        var markerIcon = {
            url: typeImage,
            size: new google.maps.Size(20, 34),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(10, 34)
        };

        marker.setZIndex(zIndex);
        marker.setIcon(markerIcon);
    }

    function asyncLoadGoogleMaps() {
        var script = document.createElement('script');
        script.type = 'text/javascript';

        script.src = 'http://maps.googleapis.com/maps/api/js?v=3.exp&libraries=drawing,geometry&callback=initApp&key=';

        document.body.appendChild(script);
    }

    initApp = initialize;

    $(window).on('load', asyncLoadGoogleMaps).on('resize', onWindowResize);

}());