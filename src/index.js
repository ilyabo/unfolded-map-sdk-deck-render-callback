// import { createMap } from "http://localhost:8090/index.js";
// import { createMap } from "@unfolded/map-sdk";
import {createUnfoldedRenderTarget} from './lib/unfolded-render-target'
import { csvParse, range } from "d3";
import {interpolate} from 'popmotion'
import "./css/main.css";
import * as dat from 'dat.gui';

const NUM_CIRCLES = 10;
const DATASET_ID = "5b1fd10b-cbee-42bc-b162-4536e0c9252d"; // this id is referenced in map-config.json
const TRIP_LAYER_ID = "hzc32m9";

const controls = {
  hideUnfolded: false,
  durationSec: 5,
  scrubberMs: 0
};

const gui = new dat.GUI();

(async () => {
  const mapConfig = await (await fetch("/data/map-config.json")).json();
  const flightData = await generateData();
  const {unfoldedMap, renderer} = await createUnfoldedRenderTarget(
    document.querySelector("#unfolded"),
    document.querySelector("#interleaved-deck"),
    onDeckRender
  );

  const mapSdk = unfoldedMap.getMapSdk();
  mapSdk.setMapConfig(mapConfig, {
    additionalDatasets: [
      {
        id: DATASET_ID,
        data: flightData,
        label: "Flight data",
      },
    ],
  });
  unfoldedMap.setProps({hidden: controls.hideUnfolded});

  setAnimation({mapSdk, durationSec: controls.durationSec, renderer})

  // gui
  const hideUnfolded = gui.add(controls, 'hideUnfolded').name('Hide Unfolded Editor').listen();
  hideUnfolded.onChange(function (hidden) {
    unfoldedMap.setProps({hidden});
  });

  const timeScrubber = gui.add(controls, 'scrubberMs', 0, controls.durationSec * 1000).name('Time Scrubber').listen()
  timeScrubber.onChange(function (newScrubberMs) {
    renderer.seek(newScrubberMs)
  })

  const durationSec = gui.add(controls, 'durationSec', 1, 30).name('Video Length').listen()
  durationSec.onChange(function (newDurationSec) {
    setAnimation({mapSdk, durationSec: newDurationSec, renderer})

    // Sync scrubber
    const newDurationMs = newDurationSec * 1000;
    if (controls.scrubberMs > newDurationMs) {
      // scrubber needs to stay within animation.
      controls.scrubberMs = newDurationMs
    }
    timeScrubber.max(newDurationMs)
    timeScrubber.setValue(controls.scrubberMs)
  })

  const hubbleLib = unfoldedMap.getLibs()?.hubble;

  gui.add({render: function () {
    hideUnfolded.setValue(true)

    renderer.setProps({
      Encoder: hubbleLib.WebMEncoder,
      formatConfigs: {webm: {quality: 0.99}}
    })
    renderer.render()
  }}, 'render').name('Render Video')

  gui.add({preview: function () {
    renderer.setProps({Encoder: hubbleLib.PreviewEncoder})
    renderer.render()
  }}, 'preview').name('Preview Video')

  gui.add({stop: function () {
    hideUnfolded.setValue(false)
    renderer.stop({})
    timeScrubber.setValue(0)
  }}, 'stop').name('Stop Render')

})();

function onDeckLoad({ deck }) {
  console.log("onDeckLoad", deck);
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

function getTimecode(durationSec) {
  return {start: 0, end: Math.floor(durationSec * 1000), framerate: 30}
}

function setAnimation({mapSdk, durationSec, renderer}) {
  // Set when duration or data domain changes.
  // Animation must be set after data is loaded.
  const unfoldedTimeline = mapSdk.getLayerTimeline() 
  const getTimestamp = interpolate(
    [0, Math.floor(durationSec * 1000)],
    [unfoldedTimeline.domain[0], unfoldedTimeline.domain[1]]
  )

  renderer.setProps({
    timecode: getTimecode(durationSec),
    onTimeChange: function (timeMs) {
      mapSdk.updateLayerTimeline({currentTime: getTimestamp(timeMs)})
    }
  })
}