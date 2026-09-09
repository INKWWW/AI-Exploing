import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {filmPose} from '../src/motion.js';
const reference=JSON.parse(fs.readFileSync(new URL('../analysis/keyboard-landmarks.json',import.meta.url)));
const samples=[];
for(const sample of reference.samples){
 const pose=filmPose(sample.time),camera=new THREE.PerspectiveCamera(15,306/539,.02,100);
 camera.position.z=pose.height/(2*Math.tan(7.5*Math.PI/180));camera.updateMatrixWorld();
 const projected=sample.labels.map(label=>{const p=new THREE.Vector3(...reference.localPoints[label]).applyQuaternion(pose.keyboardRotation).add(pose.keyboardPosition).project(camera);return [480+153*p.x,269.5-269.5*p.y];});
 const target=sample.pixels.flat(),rmse=Math.sqrt(projected.flat().reduce((sum,v,i)=>sum+(v-target[i])**2,0)/target.length);
 assert(rmse<3,`${sample.time}s source glyph projection mismatch: ${rmse}`);
 samples.push({time:sample.time,rmse});
}
for(let t=0;t<3.25;t+=1/120){const p=filmPose(t);assert(p.keyboardPosition.toArray().every(Number.isFinite));assert(Math.abs(p.keyboardRotation.length()-1)<1e-8);}
console.log(JSON.stringify({status:'passed',scope:'Annotated source glyph centers and valid rigid poses; not full-image fidelity',samples},null,2));
