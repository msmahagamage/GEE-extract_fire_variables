// =================================================================================
// SECTION 1: DATA LOADING
// =================================================================================

// Import Feature Collections
var Fire = ee.FeatureCollection('projects/ee-msammani71/assets/FireNew')
    .select(['ID','CONT_DATE','Lat','Long','D_Road','D_Water']);
var NonFire = ee.FeatureCollection('projects/ee-msammani71/assets/Non_FireNew')
    .select(['ID','CONT_DATE','Lat','Long','D_Road','D_Water']);

// Load and prepare image collections
var ndvi = ee.ImageCollection('MODIS/MOD09GA_006_NDVI');
var temperature = ee.ImageCollection('MODIS/061/MOD11A1')
    .select('LST_Day_1km')
    .map(function(img) {
      return img.multiply(0.02).subtract(273.15)
        .copyProperties(img, ['system:time_start', 'system:time_end']);
    });
var ERA5 = ee.ImageCollection("ECMWF/ERA5_LAND/HOURLY")
    .filter(ee.Filter.calendarRange(14, 14, 'hour')); 
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation');
var slope = ee.Terrain.slope(dem);
var population = ee.ImageCollection("CIESIN/GPWv411/GPW_Population_Density");
var scale = 1000;


// =================================================================================
// SECTION 2: ROBUST DATA EXTRACTION FUNCTION
// =================================================================================

/**
 * A robust function to extract variables for a single feature (point/polygon).
 * It checks for null images before trying to run calculations.
 * @param {ee.Feature} feature - The input feature with a date and geometry.
 * @param {ee.FeatureCollection} featureCollection - The collection the feature belongs to (used to get geometry).
 * @param {number} fireStatus - The label to assign (1 for fire, 0 for non-fire).
 * @return {ee.Feature} A new feature with all the extracted data.
 */
var extractData = function(feature, featureCollection, fireStatus) {
  // Get basic properties from the feature
  var id = feature.get('ID');
  var latitude = feature.get('Lat');
  var longitude = feature.get('Long');
  var Dis_Road = feature.get('D_Road');
  var Dis_Water = feature.get('D_Water');
  
  // Get geometry from the original collection to ensure it's correct
  var geometry = featureCollection.filter(ee.Filter.eq('ID', id)).first().geometry();
  
  // Define date windows
  var fireDate = ee.Date(feature.get('CONT_DATE'));
  var start = fireDate.advance(-1, 'day');
  var end = fireDate.advance(1, 'day');
  var popStart = fireDate.advance(-3, 'year');
  var popEnd = fireDate.advance(3, 'year');

  // Find images, which could be null
  var temperatureImage = temperature.filterDate(start, end).first();
  var ndviImage = ndvi.filterDate(start, end).first();
  var populationImage = population.filterDate(popStart, popEnd).first();
  var ERA5Image = ERA5.filterDate(start, end).first();

  // Use ee.Algorithms.If to safely handle potentially null images
  // Temperature calculations
  var tempStats = ee.Dictionary(ee.Algorithms.If(
    temperatureImage, // Condition: if temperatureImage is not null...
    temperatureImage.reduceRegion({ // ...then calculate stats.
      reducer: ee.Reducer.mean().combine(ee.Reducer.min(), '', true).combine(ee.Reducer.max(), '', true),
      geometry: geometry,
      scale: scale
    }),
    {LST_Day_1km_mean: null, LST_Day_1km_min: null, LST_Day_1km_max: null} // ...else return nulls.
  ));
  
  // NDVI calculation
  var ndviMean = ee.Algorithms.If(
    ndviImage,
    ndviImage.reduceRegion({reducer: ee.Reducer.mean(), geometry: geometry, scale: scale}).get('NDVI'),
    null
  );

  // Population calculation
  var popMean = ee.Algorithms.If(
    populationImage,
    populationImage.reduceRegion({reducer: ee.Reducer.mean(), geometry: geometry, scale: scale}).get('population_density'),
    null
  );
  
  // ERA5 (Climate) calculations
  var era5Stats = ee.Dictionary(ee.Algorithms.If(
    ERA5Image,
    ee.Dictionary({
      'wind': ERA5Image.expression('sqrt(u**2 + v**2)', {
                'u': ERA5Image.select('u_component_of_wind_10m'),
                'v': ERA5Image.select('v_component_of_wind_10m')
              }).reduceRegion({reducer: ee.Reducer.mean(), geometry: geometry, scale: scale}).get('u_component_of_wind_10m'),
      'evap': ERA5Image.select('total_evaporation_hourly').reduceRegion({reducer: ee.Reducer.mean(), geometry: geometry, scale: scale}).get('total_evaporation_hourly'),
      'precip': ERA5Image.select('total_precipitation_hourly').reduceRegion({reducer: ee.Reducer.mean(), geometry: geometry, scale: scale}).get('total_precipitation_hourly')
    }),
    {'wind': null, 'evap': null, 'precip': null} // Return nulls if no ERA5 image found
  ));
  
  // Static calculations (these don't depend on date, so they are always safe)
  var slopeMean = slope.reduceRegion({reducer: ee.Reducer.mean(), geometry: geometry, scale: scale}).get('slope');
  var elevationMean = dem.reduceRegion({reducer: ee.Reducer.mean(), geometry: geometry, scale: scale}).get('elevation');
  
  // Return a new feature with all properties, using .get() to access dictionary values
  return ee.Feature(null, {
    'ID': id,
    'creationDate': start,
    'Lat': latitude, 'Long': longitude,
    'temperatureMean': tempStats.get('LST_Day_1km_mean'),
    'Min_Temperature' : tempStats.get('LST_Day_1km_min'),
    'Max_Temperature' : tempStats.get('LST_Day_1km_max'),
    'ndviMean': ndviMean,
    'slope' : slopeMean,
    'elevation' : elevationMean,
    'Dis_Road' : Dis_Road,
    'Dis_Water': Dis_Water,
    'population' : popMean,
    'windspeed': era5Stats.get('wind'),
    'evaporation': era5Stats.get('evap'),
    'precipitation': era5Stats.get('precip'),
    'fire': fireStatus
  });
};


// =================================================================================
// SECTION 3: APPLY THE FUNCTION AND EXPORT
// =================================================================================

// Map the robust function over the Fire collection
var FireVariables = Fire.map(function(feature){
  return extractData(feature, Fire, 1);
});

// Map the robust function over the NonFire collection
var NonFireVariables = NonFire.map(function(feature){
  return extractData(feature, NonFire, 0);
});


// Define the columns to export
var selectors = [
  'ID', 'creationDate', 'Lat', 'Long', 'temperatureMean', 'Min_Temperature', 
  'Max_Temperature', 'ndviMean', 'slope', 'elevation', 'Dis_Water', 'Dis_Road', 
  'population', 'windspeed', 'evaporation', 'precipitation', 'fire'
];

// Export the results
Export.table.toDrive({
  collection: FireVariables,
  folder: 'Fire',
  description: 'Fire_Data_Corrected',
  fileFormat: 'CSV',
  selectors: selectors
});

Export.table.toDrive({
  collection: NonFireVariables,
  folder: 'Fire',
  description: 'Non_Fire_Data_Corrected',
  fileFormat: 'CSV',
  selectors: selectors
});
