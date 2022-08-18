import { createMap } from "http://localhost:8090/index.js";
import { csvParse, bisectLeft, range } from "d3";
import "./css/main.css";

const NUM_CIRCLES = 10;
const DATASET_ID = "5b1fd10b-cbee-42bc-b162-4536e0c9252d"; // this id is referenced in map-config.json

(async () => {
  const mapConfig = await (await fetch("/data/map-config.json")).json();
  const flightData = csvParse(
    await (await fetch("/data/flight-data.csv")).text()
  );
  const timeSteps = flightData.map((d) => +d.timestamp * 1000).sort();

  const map = await createMap({ container: document.querySelector("#root") });
  map.setMapConfig(mapConfig, {
    additionalDatasets: [
      {
        id: DATASET_ID,
        data: flightData,
        label: "Flight data",
      },
    ],
  });
  map._setDeckRenderEnhancer((deckProps, { DeckGLLayers, layerTimeline }) => {
    const { layers } = deckProps;
    const { currentTime } = layerTimeline;
    const timeIndex = findClosestTimeIndex(currentTime);
    const proximity = getProximityToTimeIndex(timeIndex, currentTime);
    const datum = flightData[timeIndex];
    return {
      layers: [
        new DeckGLLayers.ScatterplotLayer({
          id: "my-scatterplot-layer",
          data: datum ? range(NUM_CIRCLES) : [],
          pickable: false,
          opacity: 1,
          stroked: true,
          filled: false,
          radiusScale: proximity,
          radiusUnits: "pixels",
          lineWidthMinPixels: 1,
          getPosition: (d) => [+datum.lon, +datum.lat, +datum.altitude],
          getRadius: (i) => 100 * (i / NUM_CIRCLES),
          getLineColor: (i) => [
            255,
            0,
            (255 * i) / NUM_CIRCLES,
            (1.0 - proximity) * 255,
          ],
        }),
        ...layers,
      ],
    };
  });

  function findClosestTimeIndex(currentTime) {
    return bisectLeft(timeSteps, currentTime);
  }
  function getProximityToTimeIndex(timeIndex, currentTime) {
    return timeIndex < timeSteps.length - 2
      ? 1.0 -
          Math.abs(currentTime - timeSteps[timeIndex]) /
            (timeSteps[timeIndex + 1] - timeSteps[timeIndex])
      : 0.0;
  }
})();
