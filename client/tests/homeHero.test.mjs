import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HOME_HERO_AUTOPLAY_MS,
  hasHeroImage,
  heroStoryId,
  selectHomeHeroStories,
} from '../src/utils/homeHero.js';

const story = (index, image = true) => ({
  _id: String(index).padStart(24, '0'),
  title: `Tin ${index}`,
  thumbnailMediaId: image ? { secureUrl: `https://res.cloudinary.com/demo/image/upload/news-${index}.webp` } : null,
});

test('home hero uses real image stories before falling back to black card', () => {
  const articles = [
    story(1, false),
    story(2),
    story(3),
    story(4),
    story(5),
    story(6),
    story(7),
    story(8),
  ];

  const result = selectHomeHeroStories(articles);
  assert.deepEqual(result.map((item) => item.title), ['Tin 5', 'Tin 6', 'Tin 7', 'Tin 8']);
  assert.ok(result.every(hasHeroImage));
});

test('home hero prefers latest news and does not duplicate side cards unless needed', () => {
  const articles = [
    story(1),
    story(2),
    story(3),
    story(4),
    story(5),
    story(6),
    story(7),
    story(8),
  ];
  assert.deepEqual(
    selectHomeHeroStories(articles).map((item) => item.title),
    ['Tin 1', 'Tin 5', 'Tin 6', 'Tin 7'],
  );
});

test('home hero excludes failed images and uses remaining photo-ready stories', () => {
  const articles = [story(1), story(2), story(3), story(4), story(5)];
  assert.deepEqual(
    selectHomeHeroStories(articles, [heroStoryId(articles[0]), heroStoryId(articles[4])])
      .map((item) => item.title),
    ['Tin 2', 'Tin 3', 'Tin 4'],
  );
});

test('home hero supports no article and safe empty-image fallback', () => {
  assert.deepEqual(selectHomeHeroStories([]), []);
  const only = [story(1, false), story(2, false)];
  assert.deepEqual(selectHomeHeroStories(only), [only[0]]);
  assert.equal(hasHeroImage(only[0]), false);
  assert.equal(hasHeroImage({ thumbnailMediaId: '507f1f77bcf86cd799439011' }), false);
});

test('home hero delay and slide cap follow intended behavior', () => {
  assert.equal(HOME_HERO_AUTOPLAY_MS, 6000);
  assert.equal(selectHomeHeroStories([story(1), story(2), story(3)], [], 2).length, 2);
  assert.equal(selectHomeHeroStories([story(1)], [], 4).length, 1);
});
