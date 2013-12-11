var cfTaskURL = "http://route.arcgis.com/arcgis/rest/services/World/ClosestFacility/NAServer/ClosestFacility_World/";
var webMapID = "b50be0a320bf42b7826f6758a7fcbc4f";
var querySuffix = "/query?where=1%3D1&returnGeometry=true&outFields=OBJECTID&f=json";
var layerSearchString = "Bike Parking in Garages near Theft Hotspots";
var startSymbolImage = "http://nixta.github.io/sfbikehack/resources/laframboise.png";
var startSymbolWidth = 35,
	startSymbolHeight = 50;
//"https://raw.github.com/Esri/quickstart-map-js/master/images/blue-pin.png";
var eventHandlerKey = "_doNotCalculateNearestGarages";

var config = {
	zoomToResults: false
};

var map;
var searchLayer;
var cfTask,
	cfParams;
var routeSymbol,
	startSymbol;

require(["esri/map",
		 "esri/arcgis/utils",
		 "esri/tasks/ClosestFacilityTask",
		 "esri/tasks/ClosestFacilityParameters",
		 "esri/tasks/FeatureSet",
		 "esri/symbols/SimpleLineSymbol",
		 "esri/symbols/PictureMarkerSymbol",
		 "dojo/_base/Color",
		 "dojo/domReady!"], 
		function(Map, arcGISUtils, ClosestFacilityTask, ClosestFacilityParameters,
			FeatureSet, SimpleLineSymbol, PictureMarkerSymbol, Color)
	{
		dojo.addOnUnload(storeCredentials);
		// look for credentials in local storage
		loadCredentials();

		var mapDeferred = arcGISUtils.createMap(webMapID, "mapDiv");

		mapDeferred.then(function(response) 
		{
			// Set our global reference
			map = response.map;

			// Find the layer with the data we'll search for on click.
			for (i=0; i < map.graphicsLayerIds.length; i++)
			{
				if (map.graphicsLayerIds[i].lastIndexOf(layerSearchString,0) === 0)
				{
					searchLayer = map.getLayer(map.graphicsLayerIds[i]);
					searchLayer.on("click", function(evt) {
						// If a graphic is clicked, don't let the map get the click.
						require(["dojo/_base/event"], function(event) {
							evt[eventHandlerKey] = true;
						});
					});
					break;
				}
			}
			
			startSymbol = new PictureMarkerSymbol(startSymbolImage,startSymbolWidth,startSymbolHeight);

			// Initialize the Closest Facility Task
			cfTask = new ClosestFacilityTask(cfTaskURL);

			// Set up some template parameters to call it with
			cfParams = new ClosestFacilityParameters();
			cfParams.outSpatialReference = map.spatialReference;
			cfParams.defaultCutoff = 30.0;
			cfParams.returnRoutes = true;
			cfParams.defaultTargetFacilityCount = 3;
			cfParams.travelDirection = esri.tasks.NATravelDirection.TO_FACILITY;
			cfParams.doNotLocateOnRestrictedElements = true;

			// Tell it to route us to features in the layer we found earlier (Markets)
			cfParams.facilities = new esri.tasks.DataFile();
			cfParams.facilities.url = searchLayer.url + querySuffix;

			// Prepare a place to keep our map-click as the source
			cfParams.incidents = new FeatureSet();
			cfParams.returnIncidents = true;

			// And set up the symbol we'll use to draw the routes to the markets
			routeSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([0,180,255,0.8]),
								6);

			// Set up the click handler.
			map.on("click", function(evt) 
			{
				if (!evt.hasOwnProperty(eventHandlerKey)) {
					map.graphics.clear();
					// Set up the start point for our search, an "Incident"
					var g = new esri.Graphic(evt.mapPoint, startSymbol);
					map.graphics.add(g);
					cfParams.incidents.features = [g];
				
					// And run the task
					cfTask.solve(cfParams, function(solveResult) {
						if (config.zoomToResults) {
							// Zoom to the results
							map.setExtent(esri.graphicsExtent(solveResult.routes).expand(1.1), true);
						}
						// Draw the results
						map.graphics.clear();
						for (i=0; i < solveResult.routes.length; i++) {
							solveResult.routes[i].symbol = routeSymbol;
							map.graphics.add(solveResult.routes[i]);
						}
						
						for (i=0; i < solveResult.incidents.length; i++) {
							map.graphics.add(new esri.Graphic(solveResult.incidents[i].geometry, startSymbol));						
						}
					}, function(error) {
						console.log("Couldn't get closest garage! " + error);
					});
				}
			});
		}, function(error) {
			console.log("Map creation failed: ", dojo.toJson(error));
		});
	}
);

// To help with the map layout, we need these dojo layout components.
//dojo.require("dijit.layout.BorderContainer");
//dojo.require("dijit.layout.ContentPane");