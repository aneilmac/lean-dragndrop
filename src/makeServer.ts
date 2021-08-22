import * as lean from '@aneilmac/lean-client-js-browser';

export default function makeServer() : lean.Server {
  const prefix = window.location.origin;
  const opts : lean.LeanJsOpts  = {
      javascript: prefix + '/lean/lean_js_js.js',
      webassemblyJs:  prefix + '/lean/lean_js_wasm.js',
      webassemblyWasm:  prefix + '/lean/lean_js_wasm.wasm',
      libraryZip:  prefix + '/lean/library.zip',
    };
  const transport = new lean.WebWorkerTransport(opts);
  const server = new lean.Server(transport);
  //server.logMessagesToConsole = true;
  server.connect();
  return server;
}
