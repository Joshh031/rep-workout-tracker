import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeName} from '../src/compare.js';
import {strengthTrends} from '../src/analytics.js';
test('triceps pulldown and pushdown variants share a history',()=>{
 const variants=['Tricep pushdown','Tricep pulldown','Triceps Pushdown','triceps pull down','Triceps push down'];
 for(const name of variants) assert.equal(normalizeName(name),'tricepspushdown');
 const history=variants.map((name,i)=>({date:`10/${i+1}/2026`,type:'triceps',exercises:[{name,sets:[{weight:'65',reps:'12'}]}]}));
 assert.equal(strengthTrends(history,'Triceps Pushdown').length,variants.length);
});
test('overhead triceps extensions do not merge with pushdowns',()=>assert.notEqual(normalizeName('Overhead Triceps Extension'),normalizeName('Triceps Pushdown')));
