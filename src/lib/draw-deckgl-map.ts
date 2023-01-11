import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapboxOverlay from './mapbox/mapbox-overlay';
import ReactiveMapbox from 'react-map-gl/dist/esm/mapbox/mapbox';

const PIXEL_RATIO = 1;
const DEFAULT_MAP_STYLE = 'https://demotiles.maplibre.org/style.json'

/**
 * DrawDeckGLMapProps = 
 * basemapLib: any
 *   (Optional) Mapbox or maplibre compatible.
 * basemapProps: any
 * visglLibs: any
 * deckProps: any
 * parent: HTMLDivElement | string
 *   (Optional) Default: document.body
 * container: HTMLDivElement | string
 *   (Optional) basemap+deck dom element with display: "block". 
 *   Default: auto-created if not supplied.
 * height: number | string
 * width: number | string
 */

type DrawDeckGLMapProps = {
  basemapLib: any // (Optional) Mapbox or maplibre compatible.
  basemapProps: any
  visglLibs: any
  deckProps: any
  parent: HTMLDivElement | string // (Optional) Default: document.body
  container: HTMLDivElement | string // (Optional) basemap+deck dom element with display: "block". Default: auto-created if not supplied.
  height: number | string
  width: number | string
}

const defaultProps: DrawDeckGLMapProps = {
  parent: undefined,
  container: undefined,
  basemapLib: maplibregl,
  basemapProps: {
    mapStyle: DEFAULT_MAP_STYLE,
    viewState: {
      latitude: 40,
      longitude: -74.5,
      zoom: 9
    },
    pixelRatio: PIXEL_RATIO,
    antialias: true,
  },
  visglLibs: undefined,
  deckProps: {
    useDevicePixels: PIXEL_RATIO,
    // https://github.com/visgl/deck.gl/blob/f893d097d6c7e80ddd7b042722ee9d526c596a09/modules/mapbox/src/deck-utils.ts#L46-L54
    // parameters: { ... }
  },
  width: "100%",
  height: "100%"
}

export class DrawDeckGLMap {
  basemap; // Maplibre or Mapbox Map wrapped in reactive helper.
  deck; // deck.gl MapboxOverlay
  container: HTMLDivElement
  props: Partial<DrawDeckGLMapProps>

  constructor(props: Partial<DrawDeckGLMapProps>) {
    this.props = mergeProps(defaultProps, props);
    props = this.props;

    if (typeof props.parent === 'string') {
      props.parent = document.querySelector(props.parent) as HTMLDivElement;
      // assert(props.parent);
    }

    props.container = DrawDeckGLMap._createContainer(props)
    this.container = props.container;
    const {deck, basemap} = createMap(props)
    this.deck = deck;
    this.basemap = basemap;

    this.setProps(props)
  }

  setProps(props: Partial<DrawDeckGLMapProps> = {}) {
    // Update container size.
    if (props.width) {
      let width = props.width;
      if(typeof width == 'number') width = `${width}px`;
      this.container.style.width = width;
      this.basemap.map.resize();
    }
    if (props.height) {
      let height = props.height;
      if(typeof height == 'number') height = `${height}px`;
      this.container.style.height = height;
      this.basemap.map.resize();
    }

    // Carry over current props.
    this.props = mergeProps(this.props, props)

    this.basemap.setProps(this.props.basemapProps);
    this.deck.setProps(this.props.deckProps);
  }

  getCanvas() {
    return this.deck._deck.canvas;
  }

  static async initialize(props) {
    // Carry over initial props.
    props = mergeProps(defaultProps, props);

    if (!props.visglLibs) {
      // Libs must then be installed within the project.
      // @ts-expect-error not typed
      const deckCore = await import(/* webpackIgnore: true */ '@deck.gl/core')
        .catch(err => {throw new Error('@deck.gl/core not installed.')})
      // @ts-expect-error not typed
      const deckMapbox = await import(/* webpackIgnore: true */ '@deck.gl/mapbox')
        .catch(err => console.warn('@deck.gl/mapbox not installed. Will attempt with fallback.'))
      props.visglLibs = { deck: { ...deckCore, ...deckMapbox } }
    }
    
    return new DrawDeckGLMap(props)
  }

  // NOTE: Expects a container div with `display: block`.
  static _createContainer(props) {
    let container = props.container;

    if (typeof container === 'string') {
      container = document.querySelector(container);
      // assert(container);
    }

    if (!container) {
      // Auto-create div container.
      container = document.createElement('div');
      container.id = "draw-deckgl-map"
      const parent = props.parent || document.body;
      parent.appendChild(container)
    }

    return container as HTMLDivElement
  }
}

function mergeProps(currProps, nextProps) {
  // Carry over current props. Selectivly deep-merge props (many cannot be copied).
  const props = {...currProps, ...nextProps}
  if (nextProps.basemapProps) {
    props.basemapProps = {
      ...currProps.basemapProps, 
      ...nextProps.basemapProps
    }
  }
  if (nextProps.deckProps) {
    props.deckProps = {
      ...currProps.deckProps, 
      ...nextProps.deckProps
    }
  }
  return props;
}

function createMap({basemapLib, basemapProps, visglLibs, deckProps, container}: Partial<DrawDeckGLMapProps>) {
  const basemap = new ReactiveMapbox(basemapLib.Map, basemapProps, container as HTMLDivElement)
  const deck = new MapboxOverlay({
    interleaved: true,
    ...deckProps
  }, visglLibs);
  basemap.map.addControl(deck);
  return { basemap, deck }
}