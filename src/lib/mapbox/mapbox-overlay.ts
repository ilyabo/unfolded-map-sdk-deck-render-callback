import {getViewState, getDeckInstance, getInterleavedProps} from './deck-utils';

import {resolveLayers} from './resolve-layers';

/**
 * Implements Mapbox [IControl](https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol) interface
 * Renders deck.gl layers over the base map and automatically synchronizes with the map's camera
 */
export default class MapboxOverlay {
  _props;
  _deck;
  _map;
  _container;
  _interleaved;
  __libs;

  constructor(props, libs) {
    const {interleaved = false, ...otherProps} = props;
    this._interleaved = interleaved;
    this._props = otherProps;
    this.__libs = libs;
  }

  /** Update (partial) props of the underlying Deck instance. */
  setProps(props) {
    if (this._interleaved && props.layers) {
      resolveLayers(this._map, this._deck, this._props.layers, props.layers, this.__libs);
    }

    Object.assign(this._props, props);

    if (this._deck) {
      this._deck.setProps(
        this._interleaved
          ? getInterleavedProps(this._props, this.__libs)
          : this._props
      );
    }
  }

  /** Called when the control is added to a map */
  onAdd(map) {
    this._map = map;
    return this._interleaved ? this._onAddInterleaved(map) : this._onAddOverlaid(map);
  }

  _onAddOverlaid(map) {
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'absolute',
      left: 0,
      top: 0,
      pointerEvents: 'none'
    });
    this._container = container;

    this._deck = new this.__libs.deck.Deck({
      ...this._props,
      parent: container,
      viewState: getViewState(map)
    })
    this._deck.userData = {};

    map.on('resize', this._updateContainerSize);
    map.on('render', this._updateViewState);
    map.on('mousemove', this._handleMouseEvent);
    map.on('mouseout', this._handleMouseEvent);
    map.on('click', this._handleMouseEvent);
    map.on('dblclick', this._handleMouseEvent);

    this._updateContainerSize();
    return container;
  }

  _onAddInterleaved(map) {
    const deck = new this.__libs.deck.Deck({
      ...this._props,
      // @ts-ignore non-public map property
      gl: map.painter.context.gl
    });
    deck.userData = {};

    this._deck = getDeckInstance({
      map,
      // @ts-ignore non-public map property
      gl: map.painter.context.gl,
      deck
    }, this.__libs);

    map.on('styledata', this._handleStyleChange);
    resolveLayers(map, this._deck, [], this._props.layers, this.__libs);

    return document.createElement('div');
  }

  /** Called when the control is removed from a map */
  onRemove() {
    const map = this._map;

    if (map) {
      if (this._interleaved) {
        this._onRemoveInterleaved(map);
      } else {
        this._onRemoveOverlaid(map);
      }
    }

    this._deck?.finalize();
    this._deck = undefined;
    this._map = undefined;
    this._container = undefined;
  }

  _onRemoveOverlaid(map) {
    map.off('resize', this._updateContainerSize);
    map.off('render', this._updateViewState);
    map.off('mousemove', this._handleMouseEvent);
    map.off('mouseout', this._handleMouseEvent);
    map.off('click', this._handleMouseEvent);
    map.off('dblclick', this._handleMouseEvent);
  }

  _onRemoveInterleaved(map) {
    map.off('styledata', this._handleStyleChange);
    resolveLayers(map, this._deck, this._props.layers, [], this.__libs);
  }

  getDefaultPosition() {
    return 'top-left';
  }

  /** Forwards the Deck.pickObject method */
  pickObject(params) {
    this.__libs.deck.assert(this._deck);
    return this._deck.pickObject(params);
  }

  /** Forwards the Deck.pickMultipleObjects method */
  pickMultipleObjects(params) {
    this.__libs.deck.assert(this._deck);
    return this._deck.pickMultipleObjects(params);
  }

  /** Forwards the Deck.pickObjects method */
  pickObjects(params) {
    this.__libs.deck.assert(this._deck);
    return this._deck.pickObjects(params);
  }

  /** Remove from map and releases all resources */
  finalize() {
    if (this._map) {
      this._map.removeControl(this);
    }
  }

  _handleStyleChange = () => {
    resolveLayers(this._map, this._deck, this._props.layers, this._props.layers, this.__libs);
  };

  _updateContainerSize = () => {
    if (this._map && this._container) {
      const {clientWidth, clientHeight} = this._map.getContainer();
      Object.assign(this._container.style, {
        width: `${clientWidth}px`,
        height: `${clientHeight}px`
      });
    }
  };

  _updateViewState = () => {
    const deck = this._deck;
    if (deck) {
      // @ts-ignore (2345) map is always defined if deck is
      deck.setProps({viewState: getViewState(this._map)});
      // Redraw immediately if view state has changed
      deck.redraw();
    }
  };

  _handleMouseEvent = (event) => {
    const deck = this._deck;
    if (!deck) {
      return;
    }

    const mockEvent = {
      type: event.type,
      offsetCenter: event.point,
      srcEvent: event
    };

    switch (event.type) {
      case 'click':
        // @ts-expect-error not typed
        mockEvent.tapCount = 1;
        // Hack: because we do not listen to pointer down, perform picking now
        deck._onPointerDown(mockEvent);
        deck._onEvent(mockEvent);
        break;

      case 'dblclick':
        mockEvent.type = 'click';
        // @ts-expect-error not typed
        mockEvent.tapCount = 2;
        deck._onEvent(mockEvent);
        break;

      case 'mousemove':
        mockEvent.type = 'pointermove';
        deck._onPointerMove(mockEvent);
        break;

      case 'mouseout':
        mockEvent.type = 'pointerleave';
        deck._onPointerMove(mockEvent);
        break;

      default:
        return;
    }
  };
}