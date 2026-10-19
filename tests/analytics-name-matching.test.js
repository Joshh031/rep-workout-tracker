import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeName} from '../src/compare.js';
import {strengthTrends} from '../src/analytics.js';
test('case differences and plural variations keep one exercise history',()=>{
 const history=[
  {date:'2026-10-01',type:'chest',exercises:[{name:'Bench Press',sets:[{weight:'225',reps:'8'}]}]},
  {date:'2026-10-08',type:'chest',exercises:[{name:'bench press',sets:[{weight:'225',reps:'9'}]}]},
  {date:'2026-10-15',type:'chest',exercises:[{name:'BENCH PRESSES',sets:[{weight:'230',reps:'8'}]}]}
 ];
 assert.equal(normalizeName('Bench Press'),normalizeName('bench press'));
 assert.equal(strengthTrends(history,'Bench Press').length,3);
 assert.equal(strengthTrends(history,'bench presses').length,3);
});
test('distinct equipment is not merged',()=>{
 assert.notEqual(normalizeName('Bench Press'),normalizeName('Smith Machine Bench Press'));
 assert.notEqual(normalizeName('Bench Press'),normalizeName('Incline Bench Press'));
});
