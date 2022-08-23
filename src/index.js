import { createMap } from "http://localhost:8090/index.js";
import { csvParse, range } from "d3";
import "./css/main.css";

const NUM_CIRCLES = 10;
const DATASET_ID = "5b1fd10b-cbee-42bc-b162-4536e0c9252d"; // this id is referenced in map-config.json
const TRIP_LAYER_ID = "hzc32m9";

(async () => {
  const mapConfig = await (await fetch("/data/map-config.json")).json();
  const flightData = csvParse(
    await (await fetch("/data/flight-data.csv")).text()
  );
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
  map._setDeckRenderCallback(
    (
      deckProps,
      { mapIndex, DeckGLLayers, layerTimeline, layersRenderData }
    ) => {
      const { currentTime } = layerTimeline;
      const { layers } = deckProps;
      const { position } = layersRenderData[TRIP_LAYER_ID].data[0];
      const pulseRate = 1 / 20000;
      const t = (currentTime % (1 / pulseRate)) * pulseRate;
      return {
        layers: [
          new DeckGLLayers.ScatterplotLayer({
            id: "my-scatterplot-layer",
            data: range(NUM_CIRCLES),
            pickable: false,
            opacity: 1,
            stroked: true,
            filled: false,
            radiusScale: t,
            radiusUnits: "pixels",
            lineWidthMinPixels: 3,
            getPosition: position,
            getRadius: (i) => 100 * (i / NUM_CIRCLES),
            getLineColor: (i) => [
              255,
              0,
              (255 * i) / NUM_CIRCLES,
              (1.0 - t) * 255,
            ],
          }),
          ...layers,
        ],
      };
    }
  );
})();
