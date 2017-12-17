export class AnnotationManager {
  constructor() {}

  public setParam(imageParam) {
    const wwElement = document.getElementById('ww');
    if (wwElement) {
      wwElement.textContent = imageParam.ww;
    }
    const wcElement = document.getElementById('wc');
    if (wcElement) {
      wcElement.textContent = imageParam.wc;
    }
    const zoomElement = document.getElementById('zoom');
    if (zoomElement) {
      zoomElement.textContent = `x${imageParam.zoom.toFixed(2)}`;
    }
    const dxElement = document.getElementById('dX');
    if (dxElement) {
      dxElement.textContent = imageParam.deltaX.toFixed(0);
    }
    const dyElement = document.getElementById('dY');
    if (dyElement) {
      dyElement.textContent = imageParam.deltaY.toFixed(0);
    }
  }

}