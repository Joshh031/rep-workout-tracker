import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeName} from '../src/compare.js';
import {strengthTrends} from '../src/analytics.js';

test('isolateral back row aliases consolidate while other rows stay distinct',()=>{
 for(const name of ['ISO-lateral row','Isolateral row','ISO-lateral back row','isolateral BACK row']){
  assert.equal(normalizeName(name),'isolateralrow');
 }
 assert.notEqual(normalizeName('Cable Row'),normalizeName('ISO-lateral row'));
});
test('back extension variations consolidate, distinct machines are preserved',()=>{
 for(const name of ['Lower back extension','Lower back extension machine','Back extension','Back extensions']){
  assert.equal(normalizeName(name),'backextension');
 }
 assert.notEqual(normalizeName('Seated back extension'),normalizeName('Back extension'));
});
test('malformed set fragment cannot become an exercise',()=>{
 assert.equal(normalizeName('x245;'),'');
 assert.equal(normalizeName('X 245'),'');
});
test('all aliased workouts contribute to the same strength history',()=>{
 const history=[
  {date:'2026-10-01',type:'back',exercises:[{name:'ISO-lateral row',sets:[{reps:'8',weight:'245'}]}]},
  {date:'2026-10-12',type:'back',exercises:[{name:'ISO-lateral back row',sets:[{reps:'10',weight:'265'}]}]}
 ];
 assert.equal(strengthTrends(history,'Isolateral row').length,2);
});
