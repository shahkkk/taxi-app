/* Taryfa – Warsaw ride price comparison. Plain JavaScript, no build step. */
(function () {
  'use strict';

  var CFG = window.TARYFA_CONFIG;
  var PLACES = window.TARYFA_PLACES || [];
  var $ = function (id) { return document.getElementById(id); };

  var state = {
    pickup: null,          // { name, sub, lat, lng }
    dropoff: null,
    rideClass: 'standard',
    selected: null,        // provider id
    pinMode: null,         // 'pickup' | 'dropoff' | null
    route: null,           // { km, baseMin, geometry: [[lat,lng],...], source: 'osrm'|'estimate' }
    offers: [],
    routeReq: 0
  };

  /* ---------- helpers ---------- */
  function norm(s) {
    return String(s || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function haversine(a, b) {
    var R = 6371, r = Math.PI / 180;
    var dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var h = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.pow(Math.sin(dLng / 2), 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function rideName(o) { return o.product && o.product !== o.provider ? o.provider + ' ' + o.product : o.provider; }
  function money(v) { return v.toFixed(2).replace('.', ',') + ' zł'; }
  function km(v) { return v.toFixed(1).replace('.', ',') + ' km'; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function debounce(fn, ms) {
    var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); };
  }

  /* ---------- time & demand ---------- */
  function clock() {
    var d = new Date(), p = {};
    try {
      new Intl.DateTimeFormat('en-GB', {
        timeZone: CFG.city.timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    } catch (e) {
      p.weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      p.hour = String(d.getHours()); p.minute = String(d.getMinutes()).padStart(2, '0'); p.second = String(d.getSeconds()).padStart(2, '0');
    }
    var h = parseInt(p.hour, 10) % 24, wd = p.weekday;
    var weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(wd) > -1;
    var hh = String(h).padStart(2, '0');
    return {
      h: h, wd: wd,
      peak: weekday && ((h >= 7 && h < 10) || (h >= 15 && h < 19)),
      night: h >= 22 || h < 6,
      party: (wd === 'Fri' && h >= 22) || (wd === 'Sat' && (h >= 22 || h < 4)) || (wd === 'Sun' && h < 4),
      sunday: wd === 'Sun',
      label: hh + ':' + p.minute,
      labelSec: hh + ':' + p.minute + ':' + p.second
    };
  }

  function updateClockUI(c) {
    $('clock').textContent = c.label;
    var chip = $('demandChip');
    chip.className = 'chip';
    if (c.party) { chip.textContent = 'High demand · weekend night'; chip.classList.add('chip--bad'); }
    else if (c.peak) { chip.textContent = 'Rush hour · higher prices'; chip.classList.add('chip--warn'); }
    else if (c.night) { chip.textContent = 'Night · taxi tariff 2'; chip.classList.add('chip--info'); }
    else { chip.textContent = 'Normal demand'; }
  }

  /* ---------- status messages ---------- */
  function setStatus(kind, msg) {
    var el = $('status');
    if (!msg) { el.hidden = true; return; }
    el.hidden = false;
    el.className = 'status status--' + kind;
    el.textContent = msg;
  }

  /* ---------- map ---------- */
  var map = L.map('map', { zoomControl: true, attributionControl: true }).setView(CFG.city.center, CFG.city.zoom);
  L.tileLayer(CFG.services.tiles, { maxZoom: 19, attribution: CFG.services.tilesAttribution }).addTo(map);

  function markerIcon(kind) {
    return L.divIcon({
      className: '',
      html: '<div class="marker marker--' + kind + '">' + (kind === 'a' ? 'A' : 'B') + '</div>',
      iconSize: [26, 26], iconAnchor: [13, 13]
    });
  }
  var markers = { pickup: null, dropoff: null };
  var routeLine = null, routeHalo = null, routeTip = null;

  function placeMarker(field) {
    var p = state[field];
    if (!p) {
      if (markers[field]) { map.removeLayer(markers[field]); markers[field] = null; }
      return;
    }
    if (!markers[field]) {
      markers[field] = L.marker([p.lat, p.lng], {
        icon: markerIcon(field === 'pickup' ? 'a' : 'b'),
        draggable: true,
        keyboard: true,
        title: field === 'pickup' ? 'Pickup – drag to adjust' : 'Drop-off – drag to adjust'
      }).addTo(map);
      markers[field].on('dragend', function (e) {
        var ll = e.target.getLatLng();
        setPointFromCoords(field, ll.lat, ll.lng, 'Pinned point');
      });
    } else {
      markers[field].setLatLng([p.lat, p.lng]);
    }
  }

  function drawRoute() {
    [routeLine, routeHalo, routeTip].forEach(function (l) { if (l) map.removeLayer(l); });
    routeLine = routeHalo = routeTip = null;
    if (!state.route) return;
    var g = state.route.geometry;
    routeHalo = L.polyline(g, { color: '#FFFFFF', weight: 9, opacity: 0.9, interactive: false }).addTo(map);
    routeLine = L.polyline(g, {
      color: '#2B50E8', weight: 5, opacity: 1, interactive: false,
      dashArray: state.route.source === 'osrm' ? null : '2 10', lineCap: 'round'
    }).addTo(map);
    var mid = g[Math.floor(g.length / 2)];
    routeTip = L.tooltip({ permanent: true, direction: 'top', className: 'route-chip', offset: [0, -6] })
      .setLatLng(mid).setContent(km(state.route.km) + ' · ' + travelMinutes(clock()) + ' min').addTo(map);
  }

  function fitView() {
    var pts = [];
    if (state.pickup) pts.push([state.pickup.lat, state.pickup.lng]);
    if (state.dropoff) pts.push([state.dropoff.lat, state.dropoff.lng]);
    if (state.route) pts = pts.concat(state.route.geometry);
    if (pts.length === 1) map.setView(pts[0], 16);
    else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 16 });
  }

  map.on('click', function (e) {
    if (!state.pinMode) return;
    var f = state.pinMode;
    setPinMode(null);
    setPointFromCoords(f, e.latlng.lat, e.latlng.lng, 'Pinned point');
  });

  function setPinMode(f) {
    state.pinMode = f;
    document.querySelectorAll('.pin-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.pin === f));
    });
    $('map').classList.toggle('is-pinning', !!f);
    $('pinBar').hidden = !f;
    if (f) {
      $('pinBarText').textContent = 'Click the exact spot on the map for your ' + (f === 'pickup' ? 'pickup' : 'drop-off') + '.';
      closeAllLists();
    }
  }
  document.querySelectorAll('.pin-btn').forEach(function (b) {
    b.addEventListener('click', function () { setPinMode(state.pinMode === b.dataset.pin ? null : b.dataset.pin); });
  });
  $('pinCancel').addEventListener('click', function () { setPinMode(null); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.pinMode) setPinMode(null); });

  /* ---------- geocoding (Nominatim) ---------- */
  var geoCache = {};
  var searchAbort = { pickup: null, dropoff: null };

  function formatResult(r) {
    var a = r.address || {};
    var road = a.road || a.pedestrian || a.footway || a.square || a.cycleway || '';
    var num = a.house_number || '';
    var area = a.city_district || a.suburb || a.quarter || a.neighbourhood || a.borough || a.town || a.village || '';
    var streetLine = road ? road + (num ? ' ' + num : '') : '';
    var name = r.name && r.name !== road ? r.name : (streetLine || (r.display_name || '').split(',')[0]);
    var subParts = [];
    if (streetLine && streetLine !== name) subParts.push(streetLine);
    if (area) subParts.push(area);
    if (a.postcode) subParts.push(a.postcode);
    if (!a.city && a.town) subParts.push(a.town);
    var tag = num ? 'NO.' : (r.category === 'aeroway' ? 'AIR' : r.category === 'railway' ? 'PKP' : road && !r.name ? 'ST' : 'POI');
    return { name: name, sub: subParts.join(' · ') || 'Warsaw', lat: parseFloat(r.lat), lng: parseFloat(r.lon), tag: tag, precise: !!num };
  }

  function searchRemote(q, field) {
    var key = norm(q);
    if (geoCache[key]) return Promise.resolve(geoCache[key]);
    if (searchAbort[field]) searchAbort[field].abort();
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    searchAbort[field] = ctl;
    var vb = CFG.city.viewbox.join(',');
    var url = CFG.services.geocoder + '/search?format=jsonv2&addressdetails=1&limit=7&countrycodes=pl&bounded=1' +
      '&viewbox=' + vb + '&accept-language=pl,en&q=' + encodeURIComponent(q);
    return fetch(url, { signal: ctl ? ctl.signal : undefined, headers: { 'Accept': 'application/json' } })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (list) {
        var out = list.map(formatResult);
        geoCache[key] = out;
        return out;
      });
  }

  function reverseGeocode(lat, lng) {
    var url = CFG.services.geocoder + '/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=pl,en&lat=' + lat + '&lon=' + lng;
    return fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (r) { return r && r.lat ? formatResult(r) : null; });
  }

  function localMatches(q) {
    var nq = norm(q);
    if (!nq) {
      return PLACES.slice(0, 6).map(placeToSugg);
    }
    var toks = nq.split(' ');
    return PLACES.filter(function (p) {
      var hay = norm(p.name + ' ' + p.kind + ' ' + p.district + ' ' + p.alias);
      return toks.every(function (t) { return hay.indexOf(t) > -1; });
    }).slice(0, 4).map(placeToSugg);
  }
  function placeToSugg(p) {
    var k = p.kind.toLowerCase();
    var tag = k.indexOf('airport') > -1 ? 'AIR' : k.indexOf('railway') > -1 ? 'PKP' : k.indexOf('metro') > -1 ? 'M' : k.indexOf('shopping') > -1 ? 'SHOP' : k.indexOf('park') > -1 ? 'PARK' : 'POI';
    return { name: p.name, sub: p.kind + ' · ' + p.district, lat: p.lat, lng: p.lng, tag: tag };
  }

  /* ---------- autocomplete UI ---------- */
  var lists = {
    pickup: { input: $('pickupInput'), list: $('pickupList'), clear: document.querySelector('[data-clear="pickup"]'), items: [], active: -1 },
    dropoff: { input: $('dropoffInput'), list: $('dropoffList'), clear: document.querySelector('[data-clear="dropoff"]'), items: [], active: -1 }
  };

  function renderList(field, items, msg) {
    var L_ = lists[field];
    L_.items = items; L_.active = -1;
    var html = items.map(function (s, i) {
      return '<li class="suggest__item" role="option" id="' + field + '-opt-' + i + '" data-i="' + i + '" aria-selected="false">' +
        '<span class="suggest__tag" aria-hidden="true">' + esc(s.tag) + '</span>' +
        '<span class="suggest__text"><span class="suggest__name">' + esc(s.name) + '</span>' +
        '<span class="suggest__sub">' + esc(s.sub) + '</span></span></li>';
    }).join('');
    if (msg) html += '<li class="suggest__msg" role="presentation">' + esc(msg) + '</li>';
    L_.list.innerHTML = html;
    var open = !!html && document.activeElement === L_.input;
    L_.list.hidden = !open;
    L_.input.setAttribute('aria-expanded', String(open));
    L_.input.removeAttribute('aria-activedescendant');
  }

  function closeAllLists() {
    Object.keys(lists).forEach(function (f) {
      lists[f].list.hidden = true;
      lists[f].input.setAttribute('aria-expanded', 'false');
    });
  }

  function mergeResults(local, remote) {
    var seen = {}, out = [];
    remote.concat(local).forEach(function (s) {
      var k = norm(s.name) + '|' + s.lat.toFixed(3) + s.lng.toFixed(3);
      if (!seen[k]) { seen[k] = 1; out.push(s); }
    });
    return out.slice(0, 8);
  }

  var runRemote = debounce(function (field, q) {
    searchRemote(q, field).then(function (remote) {
      if (lists[field].input.value !== q) return;
      var merged = mergeResults(localMatches(q), remote);
      renderList(field, merged, merged.length ? null : 'No match in Warsaw. Check the spelling, try a nearby landmark, or use Pin on map.');
    }).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      if (lists[field].input.value !== q) return;
      var local = localMatches(q);
      renderList(field, local, 'Address search is busy right now – try again in a moment or pin the spot on the map.');
    });
  }, 450);

  function onType(field) {
    var L_ = lists[field];
    var q = L_.input.value;
    L_.clear.hidden = !q;
    var local = localMatches(q);
    if (norm(q).length >= 3) {
      renderList(field, local, 'Searching addresses…');
      runRemote(field, q);
    } else {
      renderList(field, local, q ? 'Keep typing – e.g. “Marszałkowska 104”' : null);
    }
  }

  function moveActive(field, dir) {
    var L_ = lists[field];
    if (L_.list.hidden || !L_.items.length) return;
    L_.active = (L_.active + dir + L_.items.length) % L_.items.length;
    L_.list.querySelectorAll('.suggest__item').forEach(function (el, i) {
      el.setAttribute('aria-selected', String(i === L_.active));
      if (i === L_.active) { el.scrollIntoView({ block: 'nearest' }); L_.input.setAttribute('aria-activedescendant', el.id); }
    });
  }

  Object.keys(lists).forEach(function (field) {
    var L_ = lists[field];
    L_.input.addEventListener('input', function () { onType(field); });
    L_.input.addEventListener('focus', function () { L_.input.select(); onType(field); });
    L_.input.addEventListener('blur', function () { setTimeout(function () { L_.list.hidden = true; L_.input.setAttribute('aria-expanded', 'false'); }, 150); });
    L_.input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(field, 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(field, -1); }
      else if (e.key === 'Enter') {
        var i = L_.active > -1 ? L_.active : 0;
        if (L_.items[i]) { e.preventDefault(); choose(field, L_.items[i]); L_.input.blur(); }
      } else if (e.key === 'Escape') { L_.list.hidden = true; }
    });
    L_.list.addEventListener('mousedown', function (e) {
      var li = e.target.closest('.suggest__item');
      if (!li) return;
      e.preventDefault();
      choose(field, L_.items[+li.dataset.i]);
      L_.input.blur();
    });
    L_.clear.addEventListener('click', function () {
      state[field] = null; L_.input.value = ''; L_.clear.hidden = true;
      state.selected = null;
      placeMarker(field); updateDetails(); computeRoute();
      L_.input.focus();
    });
  });

  /* ---------- choosing points ---------- */
  function choose(field, s) {
    state[field] = { name: s.name, sub: s.sub, lat: s.lat, lng: s.lng };
    lists[field].input.value = s.name;
    lists[field].clear.hidden = false;
    state.selected = null;
    closeAllLists();
    placeMarker(field);
    updateDetails();
    computeRoute(true);
  }

  function setPointFromCoords(field, lat, lng, label) {
    state[field] = { name: label, sub: 'Finding address…', lat: lat, lng: lng };
    lists[field].input.value = label;
    lists[field].clear.hidden = false;
    state.selected = null;
    placeMarker(field); updateDetails(); computeRoute(false);
    reverseGeocode(lat, lng).then(function (r) {
      if (!r || !state[field] || state[field].lat !== lat) return;
      var name = r.name || label;
      state[field].name = name;
      state[field].sub = (label === 'Current location' ? 'Your location · ' : 'Pinned · ') + r.sub;
      lists[field].input.value = name;
      updateDetails(); renderSelection();
    }).catch(function () {
      if (!state[field] || state[field].lat !== lat) return;
      state[field].sub = 'Exact coordinates';
      updateDetails();
    });
  }

  function updateDetails() {
    ['pickup', 'dropoff'].forEach(function (f) {
      var p = state[f], el = $(f + 'Detail'), c = $(f === 'pickup' ? 'coordA' : 'coordB');
      if (p) {
        el.textContent = p.sub + ' · ' + p.lat.toFixed(5) + ', ' + p.lng.toFixed(5);
        c.textContent = p.lat.toFixed(6) + ', ' + p.lng.toFixed(6);
      } else {
        el.textContent = f === 'pickup' ? 'Pick a suggestion, use your location, or pin the exact spot.' : 'Pick a suggestion or pin the exact spot.';
        c.textContent = f === 'pickup' ? 'No pickup yet' : 'No drop-off yet';
      }
    });
  }

  /* ---------- current location ---------- */
  function locate(auto) {
    if (!('geolocation' in navigator)) {
      if (!auto) setStatus('error', 'Location isn’t available in this browser. Type your pickup or pin it on the map.');
      return;
    }
    var btn = $('locateBtn');
    btn.disabled = true; btn.querySelector('span').textContent = 'Locating…';
    setStatus('busy', 'Detecting your current location…');
    navigator.geolocation.getCurrentPosition(function (pos) {
      btn.disabled = false; btn.querySelector('span').textContent = 'Use my location';
      var lat = pos.coords.latitude, lng = pos.coords.longitude, acc = Math.round(pos.coords.accuracy || 0);
      var dist = haversine({ lat: lat, lng: lng }, { lat: CFG.city.center[0], lng: CFG.city.center[1] });
      setPointFromCoords('pickup', lat, lng, 'Current location');
      fitView();
      if (dist > 35) setStatus('warn', 'You seem to be outside Warsaw. Fares are estimated for Warsaw pricing.');
      else setStatus(acc > 100 ? 'warn' : 'ok', 'Location detected' + (acc ? ' (±' + acc + ' m)' : '') + '. Drag the A marker to fine-tune the exact spot.');
    }, function (err) {
      btn.disabled = false; btn.querySelector('span').textContent = 'Use my location';
      if (auto && err && err.code === 1) { setStatus('', ''); return; }
      setStatus('error', err && err.code === 1
        ? 'Location access is blocked. Allow it in your browser settings, or type your pickup.'
        : 'Couldn’t detect your location. Type your pickup or pin it on the map.');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }
  $('locateBtn').addEventListener('click', function () { locate(false); });

  /* ---------- routing ---------- */
  function computeRoute(refit) {
    var a = state.pickup, b = state.dropoff;
    if (!a || !b) { state.route = null; drawRoute(); render(); if (refit) fitView(); return; }
    var req = ++state.routeReq;
    var fallback = function () {
      var d = Math.max(0.8, haversine(a, b) * CFG.roadFactor);
      state.route = { km: d, baseMin: null, geometry: [[a.lat, a.lng], [b.lat, b.lng]], source: 'estimate' };
    };
    fallback(); drawRoute(); render(); if (refit) fitView();
    var url = CFG.services.router + '/' + a.lng + ',' + a.lat + ';' + b.lng + ',' + b.lat + '?overview=full&geometries=geojson&alternatives=false';
    fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        if (req !== state.routeReq) return;
        if (!j.routes || !j.routes.length) throw new Error('No route');
        var r = j.routes[0];
        state.route = {
          km: Math.max(0.5, r.distance / 1000),
          baseMin: r.duration / 60,
          geometry: r.geometry.coordinates.map(function (c) { return [c[1], c[0]]; }),
          source: 'osrm'
        };
        drawRoute(); render(); if (refit) fitView();
      })
      .catch(function () { /* keep the straight-line estimate */ });
  }

  function travelMinutes(c) {
    var r = state.route;
    if (!r) return 0;
    var level = c.peak ? 'peak' : c.night ? 'night' : 'normal';
    if (r.baseMin != null) return Math.max(3, Math.round(r.baseMin * CFG.trafficFactor[level] + 1));
    return Math.max(3, Math.round(r.km / CFG.speeds[level] * 60 + 2));
  }

  /* ---------- pricing ---------- */
  function priceOffers(c) {
    var r = state.route, cls = state.rideClass;
    var min = travelMinutes(c);
    var seed = Math.floor(Date.now() / 60000) + Math.round(state.pickup.lat * 1000) + Math.round(state.pickup.lng * 1000);
    var list = CFG.providers.map(function (p, idx) {
      var o = { id: p.id, provider: p.name, color: p.color, text: p.text, bar: p.bar, initial: p.initial };
      var span = p.eta[1] - p.eta[0] + 1;
      o.eta = p.eta[0] + ((seed * (3 + idx * 2)) % span);
      if (p.type === 'app') {
        var m = p.classes[cls];
        var surge = c.party ? p.surge.party : c.peak ? p.surge.peak : 1;
        o.product = m.product;
        o.price = Math.max(m.minimum, (m.base + r.km * m.perKm + min * m.perMin) * surge + m.bookingFee);
        o.note = surge > 1 ? 'Surge ×' + surge.toFixed(2).replace('.', ',') : 'Normal demand';
      } else {
        var t2 = c.night || c.sunday;
        var k = p.classes[cls];
        o.product = k.product;
        o.price = (p.start + r.km * (t2 ? p.perKm.tariff2 : p.perKm.tariff1) + min * p.waitingShare * p.perWaitMin) * k.multiplier;
        o.note = 'Licensed taxi · ' + (t2 ? 'tariff 2 (night/Sunday)' : 'tariff 1');
      }
      o.link = providerLink(p);
      return o;
    });
    var max = Math.max.apply(null, list.map(function (o) { return o.price; }));
    var lo = Math.min.apply(null, list.map(function (o) { return o.price; }));
    var fast = Math.min.apply(null, list.map(function (o) { return o.eta; }));
    list.forEach(function (o) {
      o.cheapest = o.price === lo;
      o.fastest = o.eta === fast;
      o.barPct = Math.max(8, Math.round(o.price / max * 100));
      o.range = Math.floor(o.price * 0.93) + '–' + Math.ceil(o.price * 1.1) + ' zł';
    });
    list.sort(function (x, y) { return x.price - y.price; });
    return list;
  }

  function providerLink(p) {
    var a = state.pickup, b = state.dropoff, e = encodeURIComponent;
    if (p.id === 'uber') {
      return 'https://m.uber.com/ul/?action=setPickup' +
        '&pickup[latitude]=' + a.lat.toFixed(6) + '&pickup[longitude]=' + a.lng.toFixed(6) + '&pickup[nickname]=' + e(a.name) +
        '&dropoff[latitude]=' + b.lat.toFixed(6) + '&dropoff[longitude]=' + b.lng.toFixed(6) + '&dropoff[nickname]=' + e(b.name);
    }
    return p.link || '#';
  }

  /* ---------- rendering ---------- */
  function render() {
    var c = clock();
    updateClockUI(c);
    $('updated').textContent = c.labelSec;
    var has = !!(state.pickup && state.dropoff && state.route);
    $('emptyState').hidden = has;
    $('results').hidden = !has;
    if (!has) { state.offers = []; renderSelection(); return; }

    var min = travelMinutes(c);
    $('statDistance').textContent = km(state.route.km);
    $('statTime').textContent = min + ' min';
    $('statTraffic').textContent = c.peak ? 'Heavy' : c.night ? 'Light' : 'Moderate';
    if (routeTip) routeTip.setContent(km(state.route.km) + ' · ' + min + ' min');

    var offers = state.offers = priceOffers(c);
    $('offers').innerHTML = offers.map(function (o) {
      var sel = state.selected === o.id;
      return '<button type="button" class="offer' + (o.cheapest ? ' offer--best' : '') + '" data-id="' + o.id + '" aria-pressed="' + sel + '">' +
        '<span class="offer__logo" aria-hidden="true" style="background:' + o.color + ';color:' + o.text + '">' + esc(o.initial) + '</span>' +
        '<span class="offer__main">' +
          '<span class="offer__title"><span class="offer__provider">' + esc(o.provider) + '</span>' +
          (o.product !== o.provider ? '<span class="offer__product">' + esc(o.product) + '</span>' : '') +
          (o.cheapest ? '<span class="badge badge--best">BEST PRICE</span>' : '') +
          (o.fastest ? '<span class="badge badge--fast">FASTEST PICKUP</span>' : '') + '</span>' +
          '<span class="offer__meta">Pickup in ~' + o.eta + ' min · ' + esc(o.note) + '</span>' +
          '<span class="bar" aria-hidden="true"><span style="width:' + o.barPct + '%;background:' + o.bar + '"></span></span>' +
        '</span>' +
        '<span class="offer__price"><span class="offer__amount">' + money(o.price) + '</span>' +
        '<span class="offer__range">' + o.range + '</span></span>' +
      '</button>';
    }).join('');

    var lo = offers[0], hi = offers[offers.length - 1], diff = hi.price - lo.price;
    $('savings').textContent = diff >= 1
      ? rideName(lo) + ' saves you ' + money(diff) + ' compared with ' + hi.provider + ' on this route. Tap a fare to choose it.'
      : 'All three are within 1 zł of each other. Tap a fare to choose it.';
    $('routeSource').textContent = state.route.source === 'osrm'
      ? 'Distance from the real driving route. Travel time adjusted for current Warsaw traffic.'
      : 'Calculating the driving route… showing a straight-line estimate for now.';
    renderSelection();
  }

  $('offers').addEventListener('click', function (e) {
    var btn = e.target.closest('.offer');
    if (!btn) return;
    state.selected = btn.dataset.id;
    render();
    $('selection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  function renderSelection() {
    var o = state.offers.filter(function (x) { return x.id === state.selected; })[0];
    var box = $('selection');
    if (!o) { box.hidden = true; return; }
    box.hidden = false;
    var pn = $('pickupNote').value.trim(), dn = $('dropoffNote').value.trim();
    $('selTitle').textContent = rideName(o);
    $('selPrice').textContent = money(o.price);
    $('selFrom').innerHTML = '<strong>' + esc(state.pickup.name) + '</strong>' + (pn ? '<em> · ' + esc(pn) + '</em>' : '');
    $('selTo').innerHTML = '<strong>' + esc(state.dropoff.name) + '</strong>' + (dn ? '<em> · ' + esc(dn) + '</em>' : '');
    $('selMeta').textContent = km(state.route.km) + ' · about ' + travelMinutes(clock()) + ' min · pickup in ~' + o.eta + ' min · likely ' + o.range;
    $('selLink').href = o.link;
    $('selLinkText').textContent = 'Book in ' + o.provider;
  }
  $('selChange').addEventListener('click', function () { state.selected = null; render(); });
  $('pickupNote').addEventListener('input', renderSelection);
  $('dropoffNote').addEventListener('input', renderSelection);

  /* ---------- ride class, swap, refresh ---------- */
  document.querySelectorAll('.seg').forEach(function (b) {
    b.addEventListener('click', function () {
      state.rideClass = b.dataset.class; state.selected = null;
      document.querySelectorAll('.seg').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      render();
    });
  });

  $('swapBtn').addEventListener('click', function () {
    var p = state.pickup; state.pickup = state.dropoff; state.dropoff = p;
    var v = lists.pickup.input.value; lists.pickup.input.value = lists.dropoff.input.value; lists.dropoff.input.value = v;
    var n = $('pickupNote').value; $('pickupNote').value = $('dropoffNote').value; $('dropoffNote').value = n;
    lists.pickup.clear.hidden = !lists.pickup.input.value; lists.dropoff.clear.hidden = !lists.dropoff.input.value;
    state.selected = null;
    placeMarker('pickup'); placeMarker('dropoff'); updateDetails(); computeRoute(false);
  });

  $('refreshBtn').addEventListener('click', render);

  /* ---------- start ---------- */
  $('year').textContent = new Date().getFullYear();
  updateDetails();
  render();
  setInterval(render, 30000);
  locate(true);
})();
