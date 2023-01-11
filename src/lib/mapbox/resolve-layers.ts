import MapboxLayer from './mapbox-layer';

const UNDEFINED_BEFORE_ID = '__UNDEFINED__';

/** Insert Deck layers into the mapbox Map according to the user-defined order */
export function resolveLayers(
  map,
  deck,
  oldLayers,
  newLayers,
  __libs
) {
  // Wait until map style is loaded
  // @ts-ignore non-public map property
  if (!map || !deck || !map.style || !map.style._loaded) {
    return;
  }

  const layers = __libs.deck._flatten(newLayers, Boolean);

  if (oldLayers !== newLayers) {
    // Step 1: remove layers that no longer exist
    const prevLayers = __libs.deck._flatten(oldLayers, Boolean);
    const prevLayerIds = new Set(prevLayers.map(l => l.id));

    for (const layer of layers) {
      prevLayerIds.delete(layer.id);
    }

    for (const id of prevLayerIds) {
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
    }
  }

  // Step 2: add missing layers
  for (const layer of layers) {
    const mapboxLayer = map.getLayer(layer.id);
    if (mapboxLayer) {
      // not typed
      mapboxLayer.implementation.setProps(layer.props);
    } else {
      map.addLayer(
        new MapboxLayer({id: layer.id, deck}, __libs),
        // beforeId is not defined in LayerProps
        layer.props.beforeId
      );
    }
  }

  // Step 3: check the order of layers
  // If beforeId is defined, the deck layer should always render before the mapbox layer [beforeId]
  // If beforeId is not defined, the deck layer should appear after all mapbox layers
  // When two deck layers share the same beforeId, they are rendered in the order that is passed into Deck props.layers
  // @ts-ignore non-public map property
  const mapLayers = map.style._order;

  // Group deck layers by beforeId
  const layerGroups = {};
  for (const layer of layers) {
    // beforeId is not defined in LayerProps
    let {beforeId} = layer.props;
    if (!beforeId || !mapLayers.includes(beforeId)) {
      beforeId = UNDEFINED_BEFORE_ID;
    }
    layerGroups[beforeId] = layerGroups[beforeId] || [];
    layerGroups[beforeId].push(layer.id);
  }

  for (const beforeId in layerGroups) {
    const layerGroup = layerGroups[beforeId];
    let lastLayerIndex =
      beforeId === UNDEFINED_BEFORE_ID ? mapLayers.length : mapLayers.indexOf(beforeId);
    let lastLayerId = beforeId === UNDEFINED_BEFORE_ID ? undefined : beforeId;
    for (let i = layerGroup.length - 1; i >= 0; i--) {
      const layerId = layerGroup[i];
      const layerIndex = mapLayers.indexOf(layerId);
      if (layerIndex !== lastLayerIndex - 1) {
        map.moveLayer(layerId, lastLayerId);
        if (layerIndex > lastLayerIndex) {
          // The last layer's index have changed
          lastLayerIndex++;
        }
      }
      lastLayerIndex--;
      lastLayerId = layerId;
    }
  }
}