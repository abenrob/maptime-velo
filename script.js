L.mapbox.accessToken = 'pk.eyJ1IjoiYWJlbnJvYiIsImEiOiJEYmh3WWNJIn0.fus8CLBKPBHDvSxiayhJyg';
var map = L.mapbox.map('map', 'mapbox.streets')
    .setView([45.186502, 5.736339], 13);
var pos = [];
var posMarker;
var addressMarker;

function closeNav() {
  $('.navHeaderCollapse').collapse('hide');
};

function geoSuccess(position) {
  pos = [position.coords.latitude, position.coords.longitude];
  console.log(pos);
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
    console.log(addressPos);
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
  });
});

function getRoute(fromPos, toPos) {
  var uri = 'http://data.metromobilite.fr/otp/routers/default/plan' +
            '?mode=BICYCLE&fromPlace=' + fromPos + '&toPlace=' + toPos;
  $.getJSON(uri, function (data) {
    console.log(data);
  });
}

getRoute([45.195456, 5.734961], [45.183911, 5.70345]);
