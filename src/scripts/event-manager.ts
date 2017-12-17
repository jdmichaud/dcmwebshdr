import { AnnotationManager } from 'scripts/annotation-manager';
import { ImageParam } from 'scripts/image-param';
import { WebGLContext } from 'scripts/webgl';

enum action_e {
  WWWC = 0,
  ZOOM = 1,
  PAN = 2,
  NONE,
};

export class EventManager {
  private action: action_e = action_e.NONE;
  private mousestart: any = { clientX: 0, clientY: 0 };
  private cursorStartPosition: number[] = [0, 0];

  constructor(
    public context: WebGLContext,
    public imageParam: ImageParam,
    public annotationMgr: AnnotationManager,
    public locations: any) {
    this.context = context;
    this.imageParam = imageParam;
    this.annotationMgr = annotationMgr;
    this.locations = locations;
  }

  public start(event) {
    this.action = event.button;
    this.mousestart.clientX = event.clientX - 7;
    this.mousestart.clientY = event.clientY - 7;
    this.cursorStartPosition = [
      (this.mousestart.clientX - this.imageParam.deltaX) / this.imageParam.zoom,
      (this.context.canvas.height - this.mousestart.clientY - this.imageParam.deltaY) / this.imageParam.zoom
    ];
  }

  public stop() {
    this.action = action_e.NONE;
  }

  public move(event) {
    switch (this.action) {
    case action_e.WWWC: {
      this.adjustWWWC(event);
      break;
    }
    case action_e.ZOOM: {
      this.adjustZoom(event);
      break;
    }
    case action_e.PAN: {
      this.adjustPan(event);
      break;
    }
    }
  }

  public dblClick(event) {
    this.imageParam.reset();
    this.context.gl.uniform1f(this.locations.windowWidthLocation, this.imageParam.ww);
    this.context.gl.uniform1f(this.locations.windowCenterLocation, this.imageParam.wc);
    this.context.gl.uniform2f(this.locations.panLocation, this.imageParam.deltaX, this.imageParam.deltaY);
    this.context.gl.uniform2f(this.locations.scaleLocation, this.imageParam.zoom, this.imageParam.zoom);
    this.annotationMgr.setParam(this.imageParam);
    this.context.drawScene(6);
  }

  private adjustWWWC(event) {
    this.imageParam.ww = Math.max(Math.min(this.imageParam.ww + event.movementX * 15, 65535), 0);
    this.imageParam.wc = Math.max(Math.min(this.imageParam.wc - event.movementY * 15, 65535), 0);
    this.context.gl.uniform1f(this.locations.windowWidthLocation, this.imageParam.ww);
    this.context.gl.uniform1f(this.locations.windowCenterLocation, this.imageParam.wc);
    this.context.drawScene(6);
    this.annotationMgr.setParam(this.imageParam);
  }

  private adjustPan(event) {
    this.imageParam.deltaY = Math.max(Math.min(this.imageParam.deltaY - event.movementY, 512), -512 * this.imageParam.zoom);
    this.imageParam.deltaX = Math.max(Math.min(this.imageParam.deltaX + event.movementX, 512), -512 * this.imageParam.zoom);
    this.context.gl.uniform2f(this.locations.panLocation, this.imageParam.deltaX, this.imageParam.deltaY);
    this.context.drawScene(6);
    this.annotationMgr.setParam(this.imageParam);
  }

  private adjustZoom(event) {
    const movement = Math.abs(event.movementX) > Math.abs(event.movementY)
      ? event.movementX
      : -event.movementY;
    this.imageParam.zoom = Math.max(
      Math.min(
        this.imageParam.zoom + movement / 100,
        10),
      0);
    this.context.gl.uniform2f(this.locations.scaleLocation, this.imageParam.zoom, this.imageParam.zoom);

    this.imageParam.deltaX = this.context.canvas.width / 2 - this.cursorStartPosition[0] * this.imageParam.zoom;
    this.imageParam.deltaY = this.context.canvas.height / 2 - this.cursorStartPosition[1] * this.imageParam.zoom;
    this.context.gl.uniform2f(this.locations.panLocation, this.imageParam.deltaX, this.imageParam.deltaY);

    this.context.drawScene(6);
    this.annotationMgr.setParam(this.imageParam);
  }
}