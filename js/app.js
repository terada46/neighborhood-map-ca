'use strict';

function initApp() {
	var ViewModel = function() {
		var self = this;
		self.markers = new ko.observableArray();
		self.search = ko.observable('');
		self.InfoMarker = null;

		self.map = new google.maps.Map(document.getElementById('map'), {
			center: {
				lat: 37.8068403,
				lng: -122.3048798
			},
			zoom: 11,
			mapTypeControl: true,
			mapTypeControlOptions: {
				position: google.maps.ControlPosition.TOP_CENTER
			}
		});

		self.updateList = function(id) {
			self.flickrPhoto(id, null);
		}


		self.flickrPhoto = function(mark_id, marker) {
			var selectedMarker = null;
			if (mark_id != null) {
				for (var i = 0; i < self.markers().length; i++) {
					if (self.markers()[i].mark_id === mark_id) {			
						var markerImage = {
							url: 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|FFFF42',
							size: new google.maps.Size(21, 34),
							origin: new google.maps.Point(0, 0),
							anchor: new google.maps.Point(10, 44),
							scaledSize: new google.maps.Size(22,35)
						};
						selectedMarker = self.markers()[i];
						selectedMarker.setIcon(markerImage);
					} else {
						self.markers()[i].setIcon();
					}
				};
			} else {
				selectedMarker = marker;
				for (var i = 0; i < self.markers().length; i++) {
						self.markers()[i].setIcon();
				};
			}

			var contentString = '<div id="flickr-content">' ;
			var flickrURL = 'https://api.flickr.com/services/rest/';
			var wikiURL = 'https://en.wikipedia.org/w/api.php';

			$.when(
				$.getJSON( flickrURL, {
					'method': 'flickr.photos.search',
					'api_key': '982b0e1744e1fa84a7b27b4d97ab104e',
					'sort': 'relevance',
					'format': 'json',
					'text': selectedMarker.title,
					'nojsoncallback': 1
				}),
				$.getJSON( wikiURL, {
					'action': 'opensearch',
					'search': selectedMarker.title,
					'limit': 1,
					'format': 'json',
					'origin': '*'
				})
			)
			.then(function(result1, result2){ 
				console.log(result2);
				var response1 = result1[2].responseJSON;
				var response2 = result2[2].responseJSON;
				if (response1.stat == 'ok') {
					var photo = response1.photos.photo[0];

					var imgUrl = 'https://farm' + photo.farm + '.staticflickr.com/' +
								photo.server + '/' + photo.id + '_' + photo.secret + '_n.jpg';
					var img = '<img src="' + imgUrl + '" >';
					var photoTitle = '<span>' + photo.title + '</span>';
					contentString += 'Search Photo of "' + selectedMarker.title + '" from Flickr' +
							img + photoTitle;
				} else if (response1.stat == 'fail') {
					contentString += '<span>Unable to load photos now. Please try again later</span><br>';
				};

				var wikiDescription = response2[2][0];	
				var wikiLink = response2[3][0];

				contentString += '<br>' + wikiDescription + '<br>Check more on wikipedia:<br><a href="' + 
								wikiLink + '" target="_blank">' + wikiLink + ' </a></div>';

				if (self.InfoMarker != null) {
					self.InfoMarker.close();
				}
				self.InfoMarker = new google.maps.InfoWindow({
					content: contentString,
					maxWidth: 300 
				});
				self.InfoMarker.open(view.map, selectedMarker);
				var markerLatlng = selectedMarker.getPosition();
				view.map.panTo(markerLatlng);

			})
		   .fail(function() {
		   		contentString += '<h2>LOADING DATA HAS FAILED!</h2><br>' +
		   						'<span>Unable to load information data from Flickr or Wikipedia, ' +
		   						'please check your network and try again later.</span>';
		   		if (self.InfoMarker != null) {
					self.InfoMarker.close();
				}
				self.InfoMarker = new google.maps.InfoWindow({
					content: contentString,
					maxWidth:260
				});
				self.InfoMarker.open(view.map, selectedMarker);
				var markerLatlng = selectedMarker.getPosition();
				view.map.panTo(markerLatlng);
		   	});
		}



		self.createMarkers = function(lat, lng, title, id) {
			var markersOption = {
				position: new google.maps.LatLng(lat, lng),
				title: title,
				visible: true,
				map: self.map,
				mark_id: id
			};
			self.markers.push(new google.maps.Marker(markersOption));
			var thisMarker = self.markers().length - 1;
			self.markers()[thisMarker].setAnimation(null);
			self.markers()[thisMarker].addListener('click', function() {
				var marker = this;
				if (marker.getAnimation() !== null) {
					marker.setAnimation(null);
				} else {
					marker.setAnimation(google.maps.Animation.BOUNCE);
					setTimeout(function() {
						marker.setAnimation(null);
					}, 1310);
				}
				self.flickrPhoto(null, this);
			})
			return markersOption;
		};

		self.positions = [
			new self.createMarkers(37.835637, -122.476808, 'Bay Area Discovery Museum', 'p1'),
			new self.createMarkers(37.795618, -122.279181, 'Port of Oakland', 'p2'),
			new self.createMarkers(37.871903, -122.258541, 'University of California, Berkeley', 'p3'),
			new self.createMarkers(37.819920, -122.478271, 'Golden Gate', 'p4'),
			new self.createMarkers(37.841373, -122.110135, 'Saint Mary\'s College of California', 'p5'),
			new self.createMarkers(37.776310, -122.434787, 'Alamo Square, San Francisco', 'p6'),
			new self.createMarkers(37.801983, -122.448667, 'Palace of Fine Arts', 'p7'),
			new self.createMarkers(37.755360, -122.452871, 'Sutro Tower', 'p8'),
			new self.createMarkers(37.733164, -122.505170, 'San Francisco Zoo', 'p9')
		];

		self.search.subscribe(function(newValue) {
			newValue = newValue.toLowerCase();
			var slice = false;
			ko.utils.arrayForEach(self.markers(), function(marker) {
				var markerTitle = marker.title.toLowerCase(); 
				if (markerTitle.search(newValue) === -1) {
					if (marker.getVisible() === true) {
						slice = true;
					}
					marker.setVisible(false);
				} else {
					if (marker.getVisible() === false) {
						slice = true;
					}
					marker.setVisible(true);
				}
			});
			if (slice === true) {
				var newArray = self.markers().slice(0);
				self.markers([]);
				self.markers(newArray);
			}
		});		

		self.clearInput = function() {
			self.search('');
		}
	};

	var view = new ViewModel();
	ko.applyBindings(view);
}
