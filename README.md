# GEE Script for Wildfire Environmental Data Extraction

## 1. Overview

This repository contains a Google Earth Engine (GEE) script designed to extract a set of environmental, topographic, climatic, and demographic variables for specified fire and non-fire locations. The primary purpose of this script is to generate a feature-rich dataset suitable for wildfire prediction modeling, risk analysis, and academic research.

The script processes two input datasets (`Fire` and `Non-Fire` locations) and, for each point, gathers corresponding data from multiple satellite and climate model sources around the event date. The final output is two CSV files ready for statistical analysis or use in machine learning workflows.

---

## 2. Input & Pre-Calculated Variables
* Latitude, Longitude: WGS84 coordinates of each point.

* Dis_Road: Calculated distance to the nearest road.

* Dis_Water: Calculated distance to the nearest water body.

---

## 3. Variables Extracted

The script samples data from multiple sources to generate the following variables for each point:

* **Topography (from NASADEM):**
    * `elevation`: Mean elevation (meters)
    * `slope`: Mean slope (degrees)
* **Vegetation (from MODIS):**
    * `ndviMean`: Mean Normalized Difference Vegetation Index (NDVI)
* **Surface Temperature (from MODIS):**
    * `temperatureMean`: Mean Land Surface Temperature (LST) in Celsius
    * `Min_Temperature`: Minimum LST in Celsius
    * `Max_Temperature`: Maximum LST in Celsius
* **Climate (from ERA5-Land Hourly):**
    * `windspeed`: Mean wind speed at 10m (m/s)
    * `precipitation`: Mean total hourly precipitation (m)
    * `evaporation`: Mean total hourly evaporation (m of water equivalent)
* **Demographics (from GPWv4):**
    * `population`: Mean population density (persons per sq km)
* **Classification Label:**
    * `fire`: A binary indicator (`1` for fire, `0` for non-fire)

---

## 4. How to Use the Script

### Prerequisites
* A Google account with access to [Google Earth Engine](https://code.earthengine.google.com/).

### Setup
1.  **Prepare Input Data**: You need two shapefiles (or other vector formats) for your fire and non-fire locations. Each file must contain the following properties: `ID`, `CONT_DATE`, `Lat`, `Long`, `D_Road`, `D_Water`.
2.  **Upload to GEE Assets**: Upload your two shapefiles to your Google Earth Engine assets.
3.  **Update Asset Paths**: Open the `extract_fire_variables.js` script and **update the file paths** on lines 7 and 130 to point to your new assets.

    ```javascript
    // Change this path to your fire data asset
    var Fire = ee.FeatureCollection('projects/your-gee-project/assets/your-fire-asset')
        .select(['ID','CONT_DATE','Lat','Long','D_Road','D_Water']);
    
    // Change this path to your non-fire data asset
    var NonFire = ee.FeatureCollection('projects/your-gee-project/assets/your-non-fire-asset')
        .select(['ID','CONT_DATE','Lat','Long','D_Road','D_Water']);
    ```

### Running the Script
1.  Copy the entire content of `extract_fire_variables.js` into the GEE Code Editor.
2.  Click the **"Run"** button.
3.  The script will prepare two export tasks. Go to the **"Tasks"** tab in the right-hand panel.
4.  Click **"Run"** on both the `Fire_Data_Corrected` and `Non_Fire_Data_Corrected` tasks to export the final CSV files to your Google Drive.

---

## 4. Data Sources

This analysis utilizes the following datasets available in Google Earth Engine:

* **NDVI:** [MODIS/MOD09GA_006_NDVI](https://developers.google.com/earth-engine/datasets/catalog/MODIS_MOD09GA_006_NDVI)
* **Land Surface Temperature:** [MODIS/061/MOD11A1](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD11A1)
* **Climate Data:** [ECMWF/ERA5_LAND/HOURLY](https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_LAND_HOURLY)
* **Elevation & Slope:** [NASA/NASADEM_HGT/001](https://developers.google.com/earth-engine/datasets/catalog/NASA_NASADEM_HGT_001)
* **Population Density:** [CIESIN/GPWv411/GPW_Population_Density](https://developers.google.com/earth-engine/datasets/catalog/CIESIN_GPWv411_GPW_Population_Density)

---
