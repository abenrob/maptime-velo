// define mapbox token for map creation
L.mapbox.accessToken = 'pk.eyJ1IjoiYWJlbnJvYiIsImEiOiJEYmh3WWNJIn0.fus8CLBKPBHDvSxiayhJyg';

// set up map
var map = L.mapbox.map('map', 'mapbox.streets')
    .setView([45.186502, 5.736339], 13);

// define global variables
var pos = [];
var posMarker;
var addressPos = [];
var addressMarker;
var bikeRouteMM;
var bikeRouteII;

// function to close mobile nav menu
function closeNav() {
  $('.navHeaderCollapse').collapse('hide');
};

// function to clear routes from map
function clearRoutes() {
  if (bikeRouteMM) {map.removeLayer(bikeRouteMM);};

  if (bikeRouteII) {map.removeLayer(bikeRouteII);};
};

// function for successful geolocaiton
function geoSuccess(position) {
  pos = [position.coords.latitude, position.coords.longitude];

  map.panTo(pos);
  if (posMarker) {map.removeLayer(posMarker);};

  posMarker = L.marker(pos, {
    icon: L.mapbox.marker.icon({
      'marker-size': 'large',
      'marker-symbol': 'bicycle',
      'marker-color': '#fa0',
    }),
  }).addTo(map);
}

// function for geolocation error
function geoError(err) {
  alert(err, 'Sorry, no position available.');
}

// use html5 geolocation
function getUserLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(geoSuccess, geoError);
  } else {
    console.log('No geolocation available');
  }
}

// get address from BAN database https://adresse.data.gouv.fr/api/
function getAddress() {
  // remove any routes
  clearRoutes();

  // get value of search box
  var search = $('#address_search').val();

  // build uri for ban data
  var uri = 'https://api-adresse.data.gouv.fr/search/?q=' + search;

  // if position set, use to inform address returns
  if (pos.length > 0) {
    uri = uri + '&lat=' + pos[0] + '&lon=' + pos[1];
  }

  $.getJSON(uri, function (data) {
    if (addressMarker) {map.removeLayer(addressMarker);};

    var coords = data.features[0].geometry.coordinates;
    addressPos = [coords[1], coords[0]];

    addressMarker = L.marker(addressPos, {
      icon: L.mapbox.marker.icon({
        'marker-size': 'large',
        'marker-symbol': 'rocket',
        'marker-color': '#66ccff',
      }),
    }).addTo(map);
    var group = new L.featureGroup([posMarker, addressMarker]);
    map.fitBounds(group.getBounds().pad(0.5));
    $('#route-menu').prop('disabled', false);
  });
};

function getMetromobiliteRoute(fromPos, toPos, callback) {
  clearRoutes();

  // build uri for API
  var uri = 'http://data.metromobilite.fr/otp/routers/default/plan' +
            '?mode=BICYCLE&fromPlace=' + fromPos + '&toPlace=' + toPos;

  $.getJSON(uri, function (data) {
    // get all node points from first returned trip
    var pts = data.plan.itineraries[0].legs[0].legGeometry.points;

    //use mapbox.polyline to decode encoded polyline string
    var decoded = polyline.decode(pts);

    // create polyline, assign color, bind popup, add to map
    bikeRouteMM = L.polyline(decoded, { color: '#21881c' }).bindPopup('Metromobilité').addTo(map);

    callback();
  });
};

function getItinisereRoute(fromPos, toPos, algorithm, callback) {
  clearRoutes();

  // get date elements to fill in date/time requirement of API
  var d = new Date();
  var dateString = d.toISOString().slice(0, 10);
  var timeString = d.getHours() + '-' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();

  // build uri for API
  var uri = 'http://www.itinisere.fr/webServices/TransinfoService/api/journeyplanner/v2/' +
            'BikeTrip/json?DepLat=' + fromPos[0] + '&DepLon=' + fromPos[1] +
            '&ArrLat=' + toPos[0] + '&ArrLon=' + toPos[1] +
            '&Date=' + dateString + '&DepartureTime=' + timeString +
            '&user_key=0016bf2ff47f630bab2e65bba954c091&Algorithm=' + algorithm + '&callback=?';

  $.getJSON(uri, function (data) {
    // get links for first trip
    var pathLinks = data.trips.Trip[0].sections.Section[0].Leg.pathLinks.PathLink;

    // isolate geometry from WKT string
    var linkCoords = pathLinks.map(function (link) {
      return wellknown.parse(link.Geometry).coordinates;
    });

    // combine all legs into one line
    var coords = linkCoords.reduce(function (a, b) {
      return a.concat(b);
    });

    // swap long/lat to lat/log
    var swappedCoords = coords.map(function (pair) {
      return pair.reverse();
    });

    // create polyline, assign color, bind popup, add to map
    bikeRouteII = L.polyline(swappedCoords, { color: '#044571' }).bindPopup('ItinIsère').addTo(map);

    callback();
  });
};

// jQuery click actions
// on get address click
$('#get_address').click(function () {
  getAddress();
});

// on get location button click
$('#get_position').click(function () {
  // remove any routes
  clearRoutes();
  getUserLocation();
});

// on dropdown select, get the route
$('#MM-route').click(function () {
  getMetromobiliteRoute(pos, addressPos, function () {
    closeNav();
  });
});

// on dropdown select, get the route
$('#II-route').click(function () {
  getItinisereRoute(pos, addressPos, 'FASTEST', function () {
    closeNav();
  });
});
