import test from 'node:test';import assert from 'node:assert/strict';
import {exerciseRecords} from '../src/pr-records.js';
import {nextTarget,strengthTrends} from '../src/analytics.js';
const history=[
 {date:'10/01/2026',type:'chest',exercises:[{name:'Bench Press',sets:[{weight:'225',reps:'8'},{weight:'135',reps:'20'}]}]},
 {date:'10/11/2026',type:'chest',exercises:[{name:'bench press',sets:[{weight:'225',reps:'9'}]}]}
];
test('PR includes matching best estimated strength set',()=>{
 const p=exerciseRecords(history).benchpress;
 assert.equal(p.maxWeight,225);assert.equal(p.maxReps,9);
 assert.deepEqual(p.bestEstimatedSet,{weight:225,reps:9});
 assert.ok(p.bestEstimated1RM>250);
});
test('next session target is explicit and measurable',()=>{
 const target=nextTarget(history,'Bench Press');
 assert.deepEqual(target.suggested,{weight:225,reps:10});
 assert.equal(strengthTrends(history,'BENCH PRESS').length,2);
});