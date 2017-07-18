'use strict';

function initApp() {

	//创建视图模型
	var ViewModel = function() {
		var self = this;
		self.markers = new ko.observableArray();
		self.search = ko.observable('');
		self.InfoMarker = null;

		//创建地图
		self.map = new google.maps.Map(document.getElementById('map'), {
			center: {
				lat: 37.8068403,
				lng: -122.3048798
			},
			zoom: 11,
			mapTypeControl: true,
			gestureHandling: 'cooperative',
			mapTypeControlOptions: {
				position: google.maps.ControlPosition.TOP_CENTER
			}
		});

		//当点击列表项时，仅传递id去执行flickrPhoto
		self.updateList = function(id) {
			self.flickrPhoto(id, null);
		};

		//根据所传递marker_id还是marker去响应操作，并打开对应marker的infowindow
		//当点击列表视图的某一项地点，仅传递mark_id参数，先获取此地点marker，然后改变marker样式，打开infowindow
		//当创建marker时，为每一个marker绑定点击事件时，仅传递marker参数，点击时直接获取第三方信息，打开infowindow
		//通过marker的title搜索来自flickr的图片和获取wikipedia的描述链接，显示在infowindow中。
		self.flickrPhoto = function(mark_id, marker) {
			var selectedMarker = null;

			//仅当点击列表视图时，才会传递marker_id，以此获取marker，并改变样式。
			if (mark_id != null) {
				for (var i = 0; i < self.markers().length; i++) {
					if (self.markers()[i].mark_id === mark_id) {			
						// var markerImage = {
						// 	url: 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|FFFF42',
						// 	size: new google.maps.Size(21, 34),
						// 	origin: new google.maps.Point(0, 0),
						// 	anchor: new google.maps.Point(10, 44),
						// 	scaledSize: new google.maps.Size(22,35)
						// };
						selectedMarker = self.markers()[i];
						selectedMarker.setIcon(highlightedIcon);
					} else {
						self.markers()[i].setIcon(defaultIcon);
					}
				};
			} else {

			//创建marker时绑定点击事件，仅传递marker参数，直接以此marker为所选marker
				selectedMarker = marker;
				for (var i = 0; i < self.markers().length; i++) {
						self.markers()[i].setIcon(defaultIcon);
				};
			};


			//同时使用flickr和wikipedia的API，获取所需的数据
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
			//成功获取后处理数据，提取相片、描述和链接，创建infowindow里显示的html
			.then(function(result1, result2) { 
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

				//如果flickr响应失败，提示错误信息
				} else if (response1.stat == 'fail') {
					contentString += '<span>Unable to load photos now. Please try again later</span><br>';
				};
				//由于wiki的opensearch并不返回响应状态，在这里并没有处理wiki的错误信息
				//另一个原因是在创建地点marker时，已经将地点的标题设置为wiki页面标准的文本标题
				//因此只要上面成功返回result，就可以确保获取正确的描述和链接
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

			//任一API获取失败，处理失败信息
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


		//marker的构造函数，除了创建marker的option，添加进markers数组，并为其绑上点击事件
		self.createMarkers = function(lat, lng, title, id) {
			var markersOption = {
				position: new google.maps.LatLng(lat, lng),
				title: title,
				visible: true,
				map: self.map,
				mark_id: id,
				icon: defaultIcon
			};
			self.markers.push(new google.maps.Marker(markersOption));
			var thisMarker = self.markers().length - 1;
			self.markers()[thisMarker].setAnimation(null);
			self.markers()[thisMarker].addListener('click', function() {
				var marker = this;
				marker.setIcon(defaultIcon);
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

		//创建marker
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

		//为search注册一个subscribe方法，响应Observable监控的文本框输入变化
		//执行筛选操作，返回地点子集，设置符合子集的marker的可见性，并刷新列表
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

		//点击文本框旁边的view all按键，清空监控属性，以此恢复默认的完整列表
		self.clearInput = function() {
			self.search('');
		}
	};

	//封装生成marker不同颜色图标的方法
	function makeMarkerIcon(markerColor) {
	    var markerImage = new google.maps.MarkerImage(
	        'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
	        '|40|_|%E2%80%A2',
	        new google.maps.Size(21, 34),
	        new google.maps.Point(0, 0),
	        new google.maps.Point(10, 34),
	        new google.maps.Size(21,34));
	    	return markerImage;
	};

	//处理加载Google Map出错提示
	function mapError() {
  		alert('Google Map initialized Error');
	};

	var defaultIcon = makeMarkerIcon('09f');
	var highlightedIcon = makeMarkerIcon('FF3');

	//实例化一个视图模型，绑定到页面
	var view = new ViewModel();
	ko.applyBindings(view);
}
