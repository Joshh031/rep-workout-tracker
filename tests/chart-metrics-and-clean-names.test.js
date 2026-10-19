import test from 'node:test';import assert from 'node:assert/strict';import {normalizeName} from '../src/compare.js';import {strengthTrends} from '../src/analytics.js';import {exerciseRecords} from '../src/pr-records.js';
test('leading set-count annotations do not split exercise history',()=>{
 assert.equal(normalizeName('(4) cables'),normalizeName('cables'));
 assert.equal(normalizeName('(6) Bench press assisted'),normalizeName('Bench press assisted'));
 const h=[{date:'10/1/2026',type:'chest',exercises:[{name:'(4) Incline',sets:[{weight:'245',reps:'8'}]}]},{date:'10/8/2026',type:'chest',exercises:[{name:'Incline',sets:[{weight:'255',reps:'8'}]}]}];
 assert.equal(strengthTrends(h,'Incline').length,2);
 assert.equal(exerciseRecords(h).incline.displayName,'Incline');
});
test('actual working weight and estimated strength can be charted separately',()=>{
 const h=[{date:'10/1/2026',type:'chest',exercises:[{name:'Bench Press',sets:[{weight:'225',reps:'8'}]}]}];
 const t=strengthTrends(h,'Bench Press');assert.equal(t[0].topWeight,225);assert.equal(t[0].estimated1RM,285);
});