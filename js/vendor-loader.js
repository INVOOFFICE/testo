(function (global) {
  'use strict';

  var basePath = 'js/vendor/';
  var loadingMap = {};

  function getVendorPath(name) {
    return basePath + name;
  }

  global.loadVendor = function (name) {
    var path = getVendorPath(name);

    if (loadingMap[name]) return loadingMap[name];

    if (document.querySelector('script[src="' + path + '"]')) {
      loadingMap[name] = Promise.resolve();
      return loadingMap[name];
    }

    loadingMap[name] = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = path;
      script.onload = function () { resolve(); };
      script.onerror = function () {
        delete loadingMap[name];
        reject(new Error('Failed to load vendor: ' + name));
      };
      document.head.appendChild(script);
    });

    return loadingMap[name];
  };

  global.loadVendors = function (names) {
    return Promise.all(names.map(function (n) { return global.loadVendor(n); }));
  };
})(window);
