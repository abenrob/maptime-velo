L.mapbox.accessToken = 'pk.eyJ1IjoiYWJlbnJvYiIsImEiOiJEYmh3WWNJIn0.fus8CLBKPBHDvSxiayhJyg';
var map = L.mapbox.map('map', 'mapbox.streets')
    .setView([45.186502, 5.736339], 13);
var pos = [];
var posMarker;
var addressMarker;
var bikeRouteMM;
var bikeRouteII;

function closeNav() {
  $('.navHeaderCollapse').collapse('hide');
};

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
  $('#get_address').prop('disabled', false);
  $('#address_search').prop('disabled', false);
  closeNav();
}

function geoError(err) {
  console.log(err, 'Sorry, no position available.');
}

var geoOptions = {
  enableHighAccuracy: true,
  maximumAge: 30000,
  timeout: 27000,
};

function getUserLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(geoSuccess, geoError, geoOptions);
  } else {
    console.log('No geolocation available');
  }
}

$('#get_position').click(function () {
  getUserLocation();
});

$('#get_address').click(function () {
  var search = $('#address_search').val();

  // https://adresse.data.gouv.fr/api/
  var uri = 'https://api-adresse.data.gouv.fr/search/?q=' + search;
  if (pos.length > 0) {
    uri = uri + '&lat=' + pos[0] + '&lon=' + pos[1];
  }

  $.getJSON(uri, function (data) {
    if (addressMarker) {map.removeLayer(addressMarker);};

    var coords = data.features[0].geometry.coordinates;
    var addressPos = [coords[1], coords[0]];

    addressMarker = L.marker(addressPos, {
      icon: L.mapbox.marker.icon({
        'marker-size': 'large',
        'marker-symbol': 'rocket',
        'marker-color': '#66ccff',
      }),
    }).addTo(map);
    var group = new L.featureGroup([posMarker, addressMarker]);
    map.fitBounds(group.getBounds().pad(0.5));
    closeNav();
    getRoute(pos, addressPos);
  });
});

function getMetromobiliteRoute(fromPos, toPos) {
  var uri = 'http://data.metromobilite.fr/otp/routers/default/plan' +
            '?mode=BICYCLE&fromPlace=' + fromPos + '&toPlace=' + toPos;
  $.getJSON(uri, function (data) {
    var pts = data.plan.itineraries[0].legs[0].legGeometry.points;
    var decoded = polyline.decode(pts);
    if (bikeRouteMM) {map.removeLayer(bikeRouteMM);};

    bikeRouteMM = L.polyline(decoded, { color: 'blue' }).bindPopup('Metromobilité').addTo(map);
  });
};

function getItinisereRoute(fromPos, toPos) {
  var d = new Date();
  var dateString = d.toISOString().slice(0, 10);
  var timeString = d.getHours() + '-' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
  var uri = 'http://www.itinisere.fr/webServices/TransinfoService/api/journeyplanner/v2/' +
            'BikeTrip/json?DepLat=' + fromPos[0] + '&DepLon=' + fromPos[1] +
            '&ArrLat=' + toPos[0] + '&ArrLon=' + toPos[1] +
            '&Date=' + dateString + '&DepartureTime=' + timeString +
            '&user_key=0016bf2ff47f630bab2e65bba954c091&Algorithm=FASTEST&callback=?';
  $.getJSON(uri, function (data) {
    var pathLinks = data.trips.Trip[0].sections.Section[0].Leg.pathLinks.PathLink;

    var linkCoords = pathLinks.map(function (link) {
      return wellknown.parse(link.Geometry).coordinates;
    });

    var coords = linkCoords.reduce(function (a, b) {
      return a.concat(b);
    });

    var swappedCoords = coords.map(function (pair) {
      return pair.reverse();
    });

    bikeRouteII = L.polyline(swappedCoords, { color: 'red' }).bindPopup('ItinIsère').addTo(map);
  });
};

function getRoute(fromPos, toPos) {
  if (bikeRouteMM) {map.removeLayer(bikeRouteMM);};

  if (bikeRouteII) {map.removeLayer(bikeRouteII);};

  getMetromobiliteRoute(fromPos, toPos);
  getItinisereRoute(fromPos, toPos);
}
