import {DrawUnfoldedMap} from './draw-unfolded-map';
import {Renderer} from "./renderer";

export async function createUnfoldedRenderTarget(unfoldedContainer, deckParent, onRender) {
  const renderer = new Renderer()
  const unfoldedMap = await DrawUnfoldedMap.initialize({ container: unfoldedContainer, deckParent, renderer, onRender })

  return {unfoldedMap, renderer}
}