import test from 'node:test';
import assert from 'node:assert/strict';
import { strengthTrends,trainingSummary,nextTarget } from '../src/analytics.js';
const h=[
 {date:'2026-10-10',type:'chest',exercises:[{name:'Bench Press',sets:[{reps:'8',weight:'225'}]},{name:'Incline Press Machine',sets:[{reps:'10',weight:'200'}]}]},
 {date:'2026-10-17',type:'chest',exercises:[{name:'Bench Press',sets:[{reps:'9',weight:'225'}]}]}
];
test('compares same exercise and computes progression',()=>{const v=strengthTrends(h,'bench presses');assert.equal(v.length,2);assert.ok(v[1].estimated1RM>v[0].estimated1RM);});
test('does not confuse machines with bench',()=>assert.equal(strengthTrends(h,'Incline Press Machine').length,1));
test('summarizes sets by workout type',()=>{const v=trainingSummary(h,28,new Date('2026-10-19'));assert.equal(v.recordedSets,3);assert.equal(v.setsByWorkoutType.chest,3);});
test('provides measured previous and conservative target',()=>{const t=nextTarget(h,'Bench Press');assert.equal(t.previous.weight,225);assert.match(t.recommendation,/rep/);});
