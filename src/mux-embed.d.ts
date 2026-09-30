// mux-embed ships an ambient `declare module 'mux-embed'` file but does not
// point to it from package.json ("types"), and its "exports" map blocks a
// subpath import of it, so TypeScript cannot resolve the package's own types.
// ProjectMuxPlayer.astro only hands the default export to
// @mux/mux-background-video via globalThis.mux, so this declares no more than
// that.
declare module 'mux-embed' {
  const mux: {
    monitor: (target: HTMLMediaElement | string, options?: Record<string, unknown>) => void;
  };
  export default mux;
}
