import test from 'node:test';import assert from 'node:assert/strict';import {exerciseRecords} from '../src/pr-records.js';
test('PR max weight and reps come from the same actual set',()=>{
 const h=[{date:'10/1/2026',type:'chest',exercises:[{name:'Bench Press',sets:[{weight:'225',reps:'8'},{weight:'135',reps:'20'}]}]},
 {date:'10/8/2026',type:'chest',exercises:[{name:'bench press',sets:[{weight:'225',reps:'9'}]}]}];
 const pr=exerciseRecords(h).benchpress;assert.equal(pr.maxWeight,225);assert.equal(pr.maxReps,9);assert.equal(pr.date,'10/8/2026');
});
test('PR table excludes malformed and generic entries',()=>{
 const h=[{date:'10/1/2026',type:'back',exercises:[{name:'x245;',sets:[{weight:'265',reps:'11'}]},{name:'Back',sets:[{weight:'285',reps:'14'}]}]}];
 assert.deepEqual(exerciseRecords(h),{});
});