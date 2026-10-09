(() => {
  const get = Storage.prototype.getItem;
  const key = Storage.prototype.key;
  window.__audit = {writes: [], workers: [], networkCalls: [], copies: [], urls: [], revoked: [], inputs: []};
  window.__readFailure = false;
  window.__storageSnapshot = () => {
    const result = {};
    for (let i = 0; i < localStorage.length; i++) { const k = key.call(localStorage, i); result[k] = get.call(localStorage, k); }
    return result;
  };
  Storage.prototype.getItem = function(k) {
    if (window.__readFailure && k === 'returnby.v1') throw new DOMException('Authored storage read refusal', 'SecurityError');
    return get.call(this, k);
  };
  for (const name of ['setItem', 'removeItem', 'clear']) {
    Storage.prototype[name] = function(...args) { window.__audit.writes.push({name, args}); throw new Error('Unexpected storage mutation in enquiry page'); };
  }
  for (const name of ['Worker', 'SharedWorker']) {
    if (window[name]) window[name] = new Proxy(window[name], {construct() { window.__audit.workers.push(name); throw new Error('Unexpected page worker'); }});
  }
  for (const name of ['fetch']) {
    const original = window[name];
    window[name] = function(...args) { window.__audit.networkCalls.push({name,args:args.map(String)}); return original.apply(this,args); };
  }
  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(...args) { window.__audit.networkCalls.push({name:'xhr',args:args.map(String)}); return open.apply(this,args); };
  const beacon = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = (...args) => { window.__audit.networkCalls.push({name:'beacon',args:args.map(String)}); return beacon(...args); };
  window.__copyMode = 'success';
  window.__copyPort = {writeText(text) {
    window.__audit.copies.push(text);
    if (window.__copyMode === 'reject') return Promise.reject(new Error('Authored clipboard refusal; download remains available.'));
    if (window.__copyMode === 'pending') return new Promise(resolve => { window.__releaseCopy = resolve; });
    return Promise.resolve();
  }};
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:window.__copyPort});
  const create = URL.createObjectURL.bind(URL);
  const revoke = URL.revokeObjectURL.bind(URL);
  window.__failNextUrl = false;
  URL.createObjectURL = blob => {
    if (window.__failNextUrl) { window.__failNextUrl=false; throw new Error('Authored object URL allocation refusal'); }
    const url=create(blob);window.__audit.urls.push(url);return url;
  };
  URL.revokeObjectURL = url => {window.__audit.revoked.push(url);return revoke(url);};
  for (const type of ['keydown','keypress','keyup','click','input','change']) {
    document.addEventListener(type,event=>window.__audit.inputs.push({type,key:event.key||null,target:event.target.id,trusted:event.isTrusted}),true);
  }
})();