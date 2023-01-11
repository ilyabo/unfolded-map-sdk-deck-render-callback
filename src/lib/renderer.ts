import {VideoCapture} from '@hubble.gl/core/dist/esm/capture/video-capture';

/**
 * RendererProps =
 * timecode: {start: number, end: number, framerate: number}
 * Encoder
 * formatConfigs
 * filename: string
 * onTimeChange: (timeMs: number) => void
 * onStopped:
 * onSave:
 * onComplete:
 * savePartial: boolean
 */

const defaultProps = {
  filename: "hubble.gl",
  timecode: {start: 0, end: 5000, framerate: 30},
  Encoder: undefined,
  formatConfigs: {webm: {quality: 0.99}},
  onTimeChange: undefined,
  onStopped: undefined,
  onSave: undefined,
  onComplete: undefined,
  savePartial: true
}

export class Renderer {
  props;
  videoCapture;

  constructor(props = {}) {
    this.props = {...defaultProps, ...props}
    this.videoCapture = new VideoCapture();
  }

  setProps(props = {}) {
    Object.assign(this.props, props);
  }

  render() {
    this.seek(this.props.timecode.start);
    this.videoCapture.render({
      Encoder: this.props.Encoder,
      formatConfigs: this.props.formatConfigs,
      timecode: this.props.timecode,
      filename: this.props.filename,
      onStop: () => this.stop()
    });
  }

  stop() {
    this.videoCapture.stop({
      onStopped: this.props.onStopped,
      onSave: this.props.onSave,
      onComplete: this.props.onComplete, 
      abort: !this.props.savePartial // TODO: rename hubble prop for clarity
    });
  }

  seek(timeMs) {
    this.props.onTimeChange && this.props.onTimeChange(timeMs);
  }

  capture(canvas) {
    this.videoCapture.capture(canvas, (timeMs) => this.seek(timeMs));
  }
}

// TODO: This class is just a reactive wrapper around VideoCapture. What if we just made VideoCapture reactive?
// - add props to 
// - add onTimeChange to 
// YES. Change VideoCapture to match this wrapper's API.