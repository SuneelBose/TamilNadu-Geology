let map;
let geologyData = {}; // Placeholder for geology.json data
let allGeoJSONLayer = null;  // To hold the full GeoJSON layer for all features
let currentDistrictFilter = 'none';  // To track the current filter

// Generate random color
function generateRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Map to store the generated colors for INDEX_LEGE values
let indexColorMap = {};

// Initialize Leaflet Map
function initMap() {
  map = L.map('map').setView([20.5937, 78.9629], 5); // Default center for India

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
}

// Fetch and load geology.json data
function loadGeologyData() {
  axios.get('geology.json').then(response => {
    geologyData = response.data;
    populateDistrictFilter();
    displayTotalArea();
    drawBarChart();
    addGeoJSONLayer(geologyData.features);  // Initially load all features
    populateLegends('none');  // Initially show all legends
  }).catch(error => {
    console.error("Error loading geology.json:", error);
  });
}

// Populate district filter dropdown
function populateDistrictFilter() {
  const districtFilter = document.getElementById('districtFilter');
  
  // Add 'None' option (ensure only one "None")
  const noneOption = document.createElement('option');
  noneOption.value = 'none';
  noneOption.textContent = 'None';
  districtFilter.appendChild(noneOption);
  
  // Add unique district options
  const districts = new Set(geologyData.features.map(feature => feature.properties.DISTRICT));
  districts.forEach(district => {
    const option = document.createElement('option');
    option.value = district;
    option.textContent = district;
    districtFilter.appendChild(option);
  });

  // Event listener for filter change
  districtFilter.addEventListener('change', filterByDistrict);
}

// Filter by selected district and update map
function filterByDistrict(event) {
  const selectedDistrict = event.target.value;

  if (selectedDistrict === 'none') {
    // Show all features if 'None' is selected
    updateGeoJSONLayer(geologyData.features);
    map.fitBounds(allGeoJSONLayer.getBounds()); // Zoom out to show all features
    populateLegends('none');  // Show legends for all categories
  } else {
    // Filter by the selected district
    const filteredData = geologyData.features.filter(feature => feature.properties.DISTRICT === selectedDistrict);
    updateGeoJSONLayer(filteredData);
    zoomToDistrict(selectedDistrict, filteredData); // Zoom to the selected district's features
    populateLegends(selectedDistrict);  // Show legends based on selected district
  }

  displayTotalArea(selectedDistrict);
  drawBarChart(selectedDistrict);
  currentDistrictFilter = selectedDistrict; // Update current filter
}

// Update GeoJSON layer on map with random color based on INDEX_LEGE
function updateGeoJSONLayer(data) {
  if (allGeoJSONLayer) {
    map.removeLayer(allGeoJSONLayer);
  }

  allGeoJSONLayer = L.geoJSON(data, {
    style: feature => {
      const indexLege = feature.properties.INDEX_LEGE;
      if (!indexColorMap[indexLege]) {
        // Assign a random color to the INDEX_LEGE if not already assigned
        indexColorMap[indexLege] = generateRandomColor();
      }
      return { color: indexColorMap[indexLege], weight: 2, fillOpacity: 0.7 };
    },
    onEachFeature: (feature, layer) => {
      layer.on('click', () => zoomToFeature(layer));
      layer.bindPopup(`<b>District:</b> ${feature.properties.DISTRICT}<br><b>Area:</b> ${feature.properties.AREA_HA} HA<br><b>Index Leg:</b> ${feature.properties.INDEX_LEGE}`);
    }
  }).addTo(map);
}

// Zoom to selected feature on click
function zoomToFeature(layer) {
  map.fitBounds(layer.getBounds());
}

// Zoom to selected district's features
function zoomToDistrict(district, filteredData) {
  const bounds = L.geoJSON(filteredData).getBounds();
  map.fitBounds(bounds);  // Zoom the map to the bounds of the selected district's features
}

// Display total area of selected district or all features
function displayTotalArea(district = 'none') {
  let totalArea = 0;

  if (district === 'none') {
    totalArea = geologyData.features.reduce((acc, feature) => acc + feature.properties.AREA_HA, 0);
  } else {
    const filteredData = geologyData.features.filter(feature => feature.properties.DISTRICT === district);
    totalArea = filteredData.reduce((acc, feature) => acc + feature.properties.AREA_HA, 0);
  }

  document.getElementById('areaDisplay').textContent = `Total Area: ${totalArea.toFixed(2)} HA`;
}

// Draw bar chart for areas
function drawBarChart(district = 'none') {
  const barChartData = district === 'none' ? geologyData.features : geologyData.features.filter(feature => feature.properties.DISTRICT === district);
  const chartLabels = [...new Set(barChartData.map(feature => feature.properties.DISTRICT))];
  const chartData = chartLabels.map(label => {
    return barChartData.filter(feature => feature.properties.DISTRICT === label).reduce((acc, feature) => acc + feature.properties.AREA_HA, 0);
  });

  const ctx = document.getElementById('barChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Area (HA)',
        data: chartData,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Populate legends based on the selected district
function populateLegends(district) {
  const legendsContainer = document.getElementById('legends');
  legendsContainer.innerHTML = '';  // Clear existing legends

  let categories = [];
  
  if (district === 'none') {
    // Show all categories if 'None' is selected
    categories = [...new Set(geologyData.features.map(feature => feature.properties.CATEGORY))];
  } else {
    // Show categories only for the selected district
    const filteredData = geologyData.features.filter(feature => feature.properties.DISTRICT === district);
    categories = [...new Set(filteredData.map(feature => feature.properties.CATEGORY))];
  }

  categories.forEach(category => {
    const legendItem = document.createElement('div');
    legendItem.classList.add('category-legend');
    legendItem.style.backgroundColor = generateRandomColor(); // Assign random color
    legendItem.textContent = category;
    legendItem.addEventListener('click', () => filterByCategory(category));
    legendsContainer.appendChild(legendItem);
  });
}

// Filter and display features based on selected category from legends
function filterByCategory(category) {
  const filteredData = geologyData.features.filter(feature => feature.properties.CATEGORY === category);
  updateGeoJSONLayer(filteredData);
  resetDistrictFilter(); // Reset the district filter
  map.fitBounds(allGeoJSONLayer.getBounds()); // Zoom to all filtered features
  displayTotalArea('none'); // Update total area
  drawBarChart('none'); // Update bar chart
}

// Reset district filter when a category is selected from legends
function resetDistrictFilter() {
  const districtFilter = document.getElementById('districtFilter');
  districtFilter.value = 'none'; // Reset to 'None'
  filterByDistrict({ target: { value: 'none' } }); // Reapply district filter logic
}

// Initialize map and load data once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadGeologyData();
});