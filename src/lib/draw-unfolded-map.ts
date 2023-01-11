import { createMap } from "@unfolded/map-sdk";
import {DrawDeckGLMap} from './draw-deckgl-map';

const DEFAULT_MAP_STYLE = 'https://demotiles.maplibre.org/style.json'

const defaultProps = {
  mapSdk: undefined, // Unfolded SDK Map 
  visglLibs: undefined, // Dynamically defined libs for deck, luma, hubble
  deckglMap: undefined, // DrawDeckGLMap
  hidden: false,
  container: undefined, // Unfolded dom element
  onRender: undefined, // Optional, customize deck props on each draw call.
}

export class DrawUnfoldedMap {
  props; 

  constructor(props) {
    this.props = {...defaultProps, ...props}
    props = this.props;
    // handlers
    props.mapSdk.eventHandlers = {
      ...props.mapSdk.eventHandlers, // Must carry over current handlers when using _onDeckRender.
      // wrap our render function in an arrow function to keep it bound to our class scope.
      _onDeckRender: (unfoldedDeckProps, unfoldedProps) => this._onDeckRender(unfoldedDeckProps, unfoldedProps),
    }
  }

  setProps(props = {}) {
    Object.assign(this.props, props);
    this.props.container.style.display = this.props.hidden ? 'none' : 'block';
  }

  getLibs() {
    return this.props.visglLibs;
  }

  getMapSdk() {
    return this.props.mapSdk;
  }

  getDeckMap() {
    return this.props.deckglMap;
  }

  _onDeckRender(unfoldedDeckProps, unfoldedProps) {
    if(this.props.onRender) unfoldedDeckProps = this.props.onRender(unfoldedDeckProps, unfoldedProps);

    const viewState = this.props.mapSdk.getView();
    const mapStyle = getMapStyle(this.props.mapSdk)
    
    // Delete problematic props
    const newProps = {...unfoldedDeckProps}
    delete newProps.useDevicePixels;
    delete newProps.views;

    this.props.deckglMap && this.props.deckglMap.setProps({
      basemapProps: {
        mapStyle,
        viewState
      },
      deckProps: {
        ...newProps,
        layers: unfoldedDeckProps.layers.map(layer => layer.clone()),
      }
    });

    if (this.props.hidden) unfoldedDeckProps.layers = [];
    return unfoldedDeckProps
  }

  // static async factory function 
  static async initialize({container, deckParent, renderer, onRender}) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
      // assert(container);
    }

    const {visglLibs, mapSdk} = await this.createUnfoldedMap(container);
    const deckglMap = new DrawDeckGLMap({
      parent: deckParent,
      visglLibs, // Inject libs loaded by Unfolded
      basemapProps: {
        onIdle: function () {
          // const three = deckglMap.deck?._deck.props.layers?.every(layer => layer.isLoaded);
          // console.log("onIdle", three)
          // Signal ready to capture frame every time map libs go idle.
          renderer.capture(deckglMap.getCanvas())
        }
      }
    })

    return new DrawUnfoldedMap({
      mapSdk,
      visglLibs,
      onRender,
      container,
      deckglMap // Supply map to draw to.
    })
  }

  static async createUnfoldedMap(container) {
    let mapSdk;
    // Resolves once vis.gl libs load within unfolded.
    const visglLibs = await new Promise(async (resolve) => { 
      mapSdk = await createMap({ container, eventHandlers: { _onDeckLoad: resolve } });
    });
    // Wait for all to resolve, since either may resolve first.
    await Promise.all([mapSdk, visglLibs])
    return {visglLibs, mapSdk}
  }
}

function getMapStyle(mapSdk) {
  const state = mapSdk.getKeplerState();
  return state.mapStyle.bottomMapStyle || DEFAULT_MAP_STYLE;
}