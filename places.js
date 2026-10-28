/*
 * Popular Warsaw places shown instantly while the address search loads.
 * Format: [name, kind, district, lat, lng, extra search words]
 */
window.TARYFA_PLACES = [
  ['Warszawa Centralna', 'Railway station', 'Śródmieście', 52.2289, 21.0034, 'dworzec centralny central station pkp'],
  ['Chopin Airport (WAW)', 'Airport', 'Włochy', 52.1672, 20.9679, 'lotnisko chopina okecie airport waw'],
  ['Modlin Airport (WMI)', 'Airport', 'Nowy Dwór Mazowiecki', 52.4511, 20.6518, 'lotnisko modlin airport wmi'],
  ['Palace of Culture and Science', 'Landmark', 'Śródmieście', 52.2318, 21.0060, 'pkin palac kultury i nauki'],
  ['Złote Tarasy', 'Shopping centre', 'Śródmieście', 52.2300, 21.0025, 'zlote tarasy mall'],
  ['Old Town Market Square', 'Landmark', 'Stare Miasto', 52.2497, 21.0122, 'rynek starego miasta old town'],
  ['Royal Castle', 'Landmark', 'Stare Miasto', 52.2479, 21.0152, 'zamek krolewski plac zamkowy'],
  ['Łazienki Park', 'Park', 'Śródmieście', 52.2153, 21.0355, 'lazienki krolewskie royal baths'],
  ['Wilanów Palace', 'Landmark', 'Wilanów', 52.1650, 21.0903, 'palac w wilanowie'],
  ['PGE Narodowy', 'Stadium', 'Praga-Południe', 52.2395, 21.0458, 'national stadium stadion narodowy'],
  ['Warszawa Wschodnia', 'Railway station', 'Praga-Północ', 52.2516, 21.0524, 'dworzec wschodni east station'],
  ['Warszawa Zachodnia', 'Railway station', 'Ochota', 52.2196, 20.9654, 'dworzec zachodni west station'],
  ['Westfield Mokotów', 'Shopping centre', 'Mokotów', 52.1800, 21.0030, 'galeria mokotow mall'],
  ['Westfield Arkadia', 'Shopping centre', 'Żoliborz', 52.2565, 20.9846, 'arkadia mall'],
  ['Plac Zbawiciela', 'Square', 'Śródmieście', 52.2194, 21.0177, 'zbawiciela'],
  ['Copernicus Science Centre', 'Museum', 'Powiśle', 52.2419, 21.0287, 'centrum nauki kopernik'],
  ['University of Warsaw', 'University', 'Śródmieście', 52.2403, 21.0189, 'uniwersytet warszawski uw'],
  ['Warsaw University of Technology', 'University', 'Śródmieście', 52.2206, 21.0101, 'politechnika warszawska pw'],
  ['Rondo ONZ', 'Business district', 'Wola', 52.2330, 20.9980, 'onz'],
  ['Rondo Daszyńskiego', 'Business district', 'Wola', 52.2300, 20.9840, 'daszynskiego'],
  ['Varso Tower', 'Office', 'Śródmieście', 52.2286, 20.9975, 'varso chmielna'],
  ['Warsaw Spire', 'Office', 'Wola', 52.2327, 20.9853, 'plac europejski'],
  ['Mokotów Business Park', 'Business district', 'Mokotów', 52.1815, 21.0120, 'domaniewska sluzewiec mordor'],
  ['POLIN Museum', 'Museum', 'Muranów', 52.2494, 20.9934, 'muzeum historii zydow polskich'],
  ['Warsaw Rising Museum', 'Museum', 'Wola', 52.2323, 20.9810, 'muzeum powstania warszawskiego uprising'],
  ['Hala Koszyki', 'Food hall', 'Śródmieście', 52.2224, 21.0124, 'koszyki'],
  ['Legia Stadium', 'Stadium', 'Śródmieście', 52.2206, 21.0410, 'stadion legii lazienkowska'],
  ['Fabryka Norblina', 'Food hall', 'Wola', 52.2330, 20.9900, 'norblin'],
  ['Elektrownia Powiśle', 'Shopping centre', 'Powiśle', 52.2400, 21.0270, 'elektrownia powisle'],
  ['Koneser Centre', 'Food hall', 'Praga-Północ', 52.2549, 21.0442, 'centrum praskie koneser zabkowska'],
  ['Wola Park', 'Shopping centre', 'Wola', 52.2420, 20.9300, 'wola park gorczewska'],
  ['Blue City', 'Shopping centre', 'Ochota', 52.2140, 20.9570, 'blue city'],
  ['Metro Kabaty', 'Metro station', 'Ursynów', 52.1310, 21.0660, 'kabaty m1'],
  ['Metro Młociny', 'Metro station', 'Bielany', 52.2910, 20.9300, 'mlociny m1'],
  ['Warsaw Zoo', 'Attraction', 'Praga-Północ', 52.2580, 21.0230, 'zoo ogrod zoologiczny'],
  ['Galeria Północna', 'Shopping centre', 'Białołęka', 52.3135, 20.9805, 'polnocna mall']
].map(function (r) {
  return { name: r[0], kind: r[1], district: r[2], lat: r[3], lng: r[4], alias: r[5] };
});
