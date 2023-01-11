import {getDeckInstance, addLayer, removeLayer, updateLayer, drawLayer} from './deck-utils';

export default class MapboxLayer {
  id;
  type;
  renderingMode;
  map;
  deck;
  props;
  __libs;

  /* eslint-disable no-this-before-super */
  constructor(props, libs) {
    if (!props.id) {
      throw new Error('Layer must have an unique id');
    }

    this.id = props.id;
    this.type = 'custom';
    this.renderingMode = props.renderingMode || '3d';
    this.map = null;
    this.deck = null;
    this.props = props;
    this.__libs = libs;
  }

  /* Mapbox custom layer methods */

  onAdd(map, gl) {
    this.map = map;
    this.deck = getDeckInstance({map, gl, deck: this.props.deck}, this.__libs);
    addLayer(this.deck, this);
  }

  onRemove() {
    if (this.deck) {
      removeLayer(this.deck, this);
    }
  }

  setProps(props) {
    // id cannot be changed
    Object.assign(this.props, props, {id: this.id});
    // safe guard in case setProps is called before onAdd
    if (this.deck) {
      updateLayer(this.deck, this);
    }
  }

  render() {
    drawLayer(this.deck, this.map, this, this.__libs);
  }
}
