export class ImageParam {
  public slope: number;
  public intercept: number;
  public ww: number;
  public wc: number;
  public deltaX: number;
  public deltaY: number;
  public zoom: number;

  private initialSlope: number;
  private initialIntercept: number;
  private initialWw: number;
  private initialWc: number;
  private initialDeltaX: number;
  private initialDeltaY: number;
  private initialZoom: number;

  constructor(slope: number, intercept: number, ww: number, wc: number,
              deltaX: number, deltaY: number, zoom: number) {
    this.initialSlope = slope;
    this.initialIntercept = intercept;
    this.initialWw = ww;
    this.initialWc = wc;
    this.initialDeltaX = deltaX;
    this.initialDeltaY = deltaY;
    this.initialZoom = zoom;
    this.reset();
  }

  public reset(): void {
    this.slope = this.initialSlope;
    this.intercept = this.initialIntercept;
    this.ww = this.initialWw;
    this.wc = this.initialWc;
    this.deltaX = this.initialDeltaX;
    this.deltaY = this.initialDeltaY;
    this.zoom = this.initialZoom;
  };
}
