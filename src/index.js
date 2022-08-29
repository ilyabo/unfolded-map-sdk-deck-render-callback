import { createMap } from "http://localhost:8090/index.js";
import { csvParse, range } from "d3";
import "./css/main.css";

const NUM_CIRCLES = 10;
const DATASET_ID = "5b1fd10b-cbee-42bc-b162-4536e0c9252d"; // this id is referenced in map-config.json
const TRIP_LAYER_ID = "hzc32m9";

(async () => {
  const mapConfig = await (await fetch("/data/map-config.json")).json();
  const flightData = await generateData();
  const map = await createMap({
    container: document.querySelector("#root"),
    eventHandlers: {
      _onDeckLoad: onDeckLoad,
      _onDeckRender: onDeckRender,
    },
  });
  map.setMapConfig(mapConfig, {
    additionalDatasets: [
      {
        id: DATASET_ID,
        data: flightData,
        label: "Flight data",
      },
    ],
  });
})();

function onDeckLoad(deck) {
  console.log("onLoad deck", deck);
}

function onDeckRender(
  deckProps,
  { deck, layersRenderData, layerTimeline, mapIndex }
) {
  const renderData = layersRenderData[TRIP_LAYER_ID];
  if (!renderData) {
    return deckProps;
  }
  const pulsePeriod = 20000;
  const { currentTime, data } = renderData;
  const t = (currentTime % pulsePeriod) / pulsePeriod;
  return {
    layers: [
      ...data.map(
        (d, di) =>
          new deck.ScatterplotLayer({
            id: `pulse-layer-${di}`,
            data: range(NUM_CIRCLES),
            pickable: false,
            opacity: 1,
            stroked: true,
            filled: false,
            radiusScale: t,
            radiusUnits: "pixels",
            lineWidthMinPixels: 3,
            getPosition: d.position,
            getRadius: (i) => 100 * (i / NUM_CIRCLES),
            getLineColor: (i) => [
              255 - 128 * di,
              0 + 128 * di,
              (255 * i) / NUM_CIRCLES,
              (1.0 - t) * 255,
            ],
          })
      ),
      ...deckProps.layers,
    ],
  };
}

async function generateData(n = 10) {
  const data = csvParse(await (await fetch("/data/flight-data.csv")).text());
  const newData = [];
  for (let i = 0; i < n; i++) {
    for (let di = 0; di < data.length; di++) {
      const d = data[di];
      newData.push({
        ...d,
        icao24: d.icao24 + i,
        timestamp: +d.timestamp + 50 * i,
        lat: +d.lat + 0.1 * i + Math.random() * 0.01,
        lon: +d.lon + 0.1 * i + Math.random() * 0.01,
        altitude: +d.altitude + 0.1 * i + Math.random() * 0.01,
      });
    }
  }
  return newData;
}
