import test from 'node:test';
import assert from 'node:assert/strict';

import {
  propertyMapLocations,
  openStreetMapEmbedUrl,
  googleMapsPropertyUrl,
} from '../src/utils/propertyMap.js';

function listing(id, coordinates) {
  return {
    _id: String(id).padStart(24, '0'),
    title: 'Nhà phố Hòa Lạc ' + id,
    slug: 'nha-pho-hoa-lac-' + id,
    contentType: 'property',
    property: {
      addressText: 'Hòa Lạc, Hà Nội',
      location: coordinates ? { type: 'Point', coordinates } : null,
    },
  };
}

test('property map only displays truly geocoded listing points', () => {
  const items = [
    listing(1, [105.526, 21.016]),
    listing(2, null),
    listing(3, [0, 0]),
    listing(4, [105.528, 21.018]),
  ];

  const results = propertyMapLocations(items);
  assert.equal(results.length, 2);
  assert.equal(results[0].longitude, 105.526);
  assert.equal(results[0].latitude, 21.016);
  assert.equal(results[0].href, '/bat-dong-san/nha-pho-hoa-lac-1');
  assert.equal(results[1].title, 'Nhà phố Hòa Lạc 4');
});

test('property map filters invalid values, duplicates and honors cap', () => {
  const first = listing(1, [105.52, 21.01]);
  const items = [
    first,
    first,
    listing(2, [181, 21]),
    listing(3, [105, 91]),
    listing(4, [105.53, 21.02]),
    listing(5, [105.54, 21.03]),
  ];

  const results = propertyMapLocations(items, 2);
  assert.deepEqual(results.map((point) => point.title), [
    'Nhà phố Hòa Lạc 1',
    'Nhà phố Hòa Lạc 4',
  ]);
});

test('property map provides opt-in OpenStreetMap and exact Google Maps coordinates', () => {
  const url = new URL(openStreetMapEmbedUrl(21.016, 105.526));
  assert.equal(url.hostname, 'www.openstreetmap.org');
  assert.equal(url.searchParams.get('layer'), 'mapnik');
  assert.equal(url.searchParams.get('marker'), '21.016,105.526');
  const bbox = url.searchParams.get('bbox').split(',').map(Number);
  assert.equal(bbox.length, 4);
  assert.ok(bbox[0] < 105.526 && bbox[2] > 105.526);
  assert.ok(bbox[1] < 21.016 && bbox[3] > 21.016);

  const google = new URL(googleMapsPropertyUrl(21.016, 105.526));
  assert.equal(google.hostname, 'www.google.com');
  assert.equal(google.searchParams.get('query'), '21.016,105.526');
});

test('map does not generate URLs for missing or invalid coordinates', () => {
  assert.equal(openStreetMapEmbedUrl(91, 105), '');
  assert.equal(googleMapsPropertyUrl(NaN, 105), '');
  assert.deepEqual(propertyMapLocations([]), []);
});
