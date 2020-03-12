global.fetch = require('node-fetch');
const chalk = require('chalk');
const d3 = require('d3');
const fs = require('fs');

/***********************************************
 * Fetches, Cleans, and Processes the Data
 * from John Hopkins
 ***********************************************/

const USStates = {
  "Alabama": "AL",
  "Alaska": "AK",
  "American Samoa": "AS",
  "Arizona": "AZ",
  "Arkansas": "AR",
  "California": "CA",
  "Colorado": "CO",
  "Connecticut": "CT",
  "Delaware": "DE",
  "District of Columbia": "DC",
  "Federated States Of Micronesia": "FM",
  "Florida": "FL",
  "Georgia": "GA",
  "Guam": "GU",
  "Hawaii": "HI",
  "Idaho": "ID",
  "Illinois": "IL",
  "Indiana": "IN",
  "Iowa": "IA",
  "Kansas": "KS",
  "Kentucky": "KY",
  "Louisiana": "LA",
  "Maine": "ME",
  "Marshall Islands": "MH",
  "Maryland": "MD",
  "Massachusetts": "MA",
  "Michigan": "MI",
  "Minnesota": "MN",
  "Mississippi": "MS",
  "Missouri": "MO",
  "Montana": "MT",
  "Nebraska": "NE",
  "Nevada": "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  "Northern Mariana Islands": "MP",
  "Ohio": "OH",
  "Oklahoma": "OK",
  "Oregon": "OR",
  "Palau": "PW",
  "Pennsylvania": "PA",
  "Puerto Rico": "PR",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  "Tennessee": "TN",
  "Texas": "TX",
  "Utah": "UT",
  "Vermont": "VT",
  "Virgin Islands": "VI",
  "Virginia": "VA",
  "Washington": "WA",
  "West Virginia": "WV",
  "Wisconsin": "WI",
  "Wyoming": "WY"
};

const saveCSV = (filename, obj) => {
  const csv = d3.csvFormat(obj);

  fs.writeFile(filename, csv, err => {
    if (err) {
      console.log(chalk.red(err));
      return;
    }
    console.log(chalk.green(`Successfully saved ${filename}`));
  })
};

const processData = (data) => {
  const USStateData = {};

  data = data.map(row => {
    // Rename Taiwan
    if (row['Province/State'].toLowerCase().indexOf('taiwan') >= 0
      || row['Province/State'].toLowerCase().indexOf('taipei') >= 0
      || row['Country/Region'].toLowerCase().indexOf('taiwan') >= 0
      || row['Country/Region'].toLowerCase().indexOf('taipei') >= 0) {
      row['Province/State'] = '';
      row['Country/Region'] = 'Taiwan';
    }
    // Rename Hong Kong
    if (row['Province/State'].toLowerCase().indexOf('hong kong') >= 0
      || row['Country/Region'].toLowerCase().indexOf('hong kong') >= 0) {
      row['Province/State'] = '';
      row['Country/Region'] = 'Hong Kong';
    }
    // Rename Macau
    if (row['Province/State'].toLowerCase().indexOf('macau') >= 0
      || row['Country/Region'].toLowerCase().indexOf('macau') >= 0) {
      row['Province/State'] = '';
      row['Country/Region'] = 'Macau';
    }
    // Rename Iran
    if (row['Country/Region'].toLowerCase().indexOf('iran') >= 0) {
      row['Country/Region'] = 'Iran';
    }
    // Rename Vatican City
    if (row['Country/Region'].toLowerCase().indexOf('holy see') >= 0) {
      row['Country/Region'] = 'Vatican City';
    }
    // Remove Viet nam
    if (row['Country/Region'].toLowerCase().indexOf('viet nam') >= 0) {
      return null;
    }
    // Rename South Korea
    if (row['Country/Region'].toLowerCase().indexOf('republic of korea') >= 0) {
      row['Country/Region'] = 'South Korea';
    }
    // Rename occupied palestinian territory
    if (row['Country/Region'].toLowerCase().indexOf('palestinian') >= 0) {
      row['Country/Region'] = 'Palestine';
    }
    // Rename Congo territory
    if (row['Country/Region'].toLowerCase().indexOf('congo') >= 0) {
      row['Country/Region'] = 'Congo';
    }

    // Remove Princess
    if (row['Province/State'].toLowerCase().indexOf('princess') >= 0) {
      return null;
    }

    // Organize US States
    if (row['Country/Region'] === 'US') {
      const splitString = row['Province/State'].split(',');

      // If this is a county
      if (splitString.length === 2) {
        // Add the county data to the state
        let state = splitString[1].trim();
        state = (state === 'D.C.') ? 'DC' : state;
        if (!USStateData[state]) USStateData[state] = [];
        USStateData[state] = USStateData[state].concat([row]);

        return null;
      }
    }

    return row;
  }).filter(row => !!row);

  // Fold county level state data into state
  data = data.map(row => {
    if (row['Country/Region'] !== 'US') return row;
    const state = USStates[row['Province/State']];

    if (state) {
      const keys = Object.keys(row).filter(
        key => key !== 'Province/State' && key !== 'Country/Region'
          && key !== 'Lat' && key !== 'Long'
      );

      keys.forEach(key => {
        if (row[key] === '0' && USStateData[state]) {
          row[key] = USStateData[state].reduce(
            (acc, val) => parseInt(val[key]) + acc,
            0
          );
        }
      });
    }

    return row;
  });

  return data;
};

console.log(chalk.blue('Fetching Latest Data from John Hopkins...'));

Promise.all([
  // Confirmed cases csv
  d3.csv('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv'),

  // Death cases csv
  d3.csv('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv'),

  // Recovered cases csv
  d3.csv('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv'),
])
  .then(([confirmed, deaths, recovered]) => {
    const processedConfirmed = processData(confirmed);
    console.log(chalk.green('Processed Confirmed Cases ✅ '));
    saveCSV(
      'csse_covid_19_data/time_series_19-covid-Confirmed.csv',
      processedConfirmed
    );

    const processedDeaths = processData(deaths);
    console.log(chalk.green('Processed Deaths Cases ✅ '));
    saveCSV(
      'csse_covid_19_data/time_series_19-covid-Deaths.csv',
      processedDeaths
    );

    const processedRecovered = processData(recovered);
    console.log(chalk.green('Processed Recovered Cases ✅ '));
    saveCSV(
      'csse_covid_19_data/time_series_19-covid-Recovered.csv',
      processedRecovered
    );
  })
  .catch((err) => console.log(chalk.red(err)));
