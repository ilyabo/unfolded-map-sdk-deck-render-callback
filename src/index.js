import { createMap } from "http://localhost:8090/index.js";
import { csvParse, bisectLeft, range } from "d3";
import "./css/main.css";

const NUM_CIRCLES = 10;
const DATASET_ID =
  // this id is referenced in map-config.json
  "5b1fd10b-cbee-42bc-b162-4536e0c9252d";

(async () => {
  const mapConfig = await (await fetch("/data/map-config.json")).json();
  const flightData = csvParse(
    await (await fetch("/data/flight-data.csv")).text()
  );
  const timeSteps = flightData.map((d) => +d.timestamp * 1000).sort();
  function findClosestTimeIndex(currentTime) {
    return bisectLeft(timeSteps, currentTime);
  }
  function getProximityToTimeIndex(timeIndex, currentTime) {
    const proximity =
      timeIndex < timeSteps.length - 2
        ? 1.0 -
          Math.abs(currentTime - timeSteps[timeIndex]) /
            (timeSteps[timeIndex + 1] - timeSteps[timeIndex])
        : 0.0;
    return proximity;
  }

  const map = await createMap({
    container: document.querySelector("#root"),
    eventHandlers: {
      // onLayerTimelineUpdate: (layerTimeline) => {
      //   const timeIndex = findClosestTimeIndex(layerTimeline.currentTime);
      //   if (timeIndex >= 0) {
      //     const datum = flightData[timeIndex];
      //     map.setView({ latitude: +datum.lat, longitude: +datum.lon });
      //   }
      // },
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
})();
