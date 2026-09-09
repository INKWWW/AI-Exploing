import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {filmPose,RESET_TIME} from '../src/motion.js';

const reference=JSON.parse(fs.readFileSync(new URL('../analysis/mechanism-landmarks.json',import.meta.url)));
const results=[];
for(const sample of reference.samples){
 const pose=filmPose(sample.time);
 const camera=new THREE.PerspectiveCamera(15,306/539,.02,100);
 camera.position.z=pose.height/(2*Math.tan(7.5*Math.PI/180));camera.updateMatrixWorld();
 const corners=reference.localPoints.map(point=>{
  const projected=new THREE.Vector3(...point).multiplyScalar(pose.mechanismScale).applyQuaternion(pose.mechanismRotation).add(pose.mechanismPosition).project(camera);
  return [480+153*projected.x,269.5-269.5*projected.y];
 });
 const rmse=Math.sqrt(corners.flat().reduce((total,v,i)=>total+(v-sample.corners.flat()[i])**2,0)/8);
 assert(rmse<4,`Projected source landmarks diverge at ${sample.time}: ${rmse}px`);
 results.push({time:sample.time,cornerRMSE:Math.round(rmse*1000)/1000});
}
for(let t=3.5;t<=8.25;t+=1/120){
 const pose=filmPose(t);
 assert(pose.mechanismPosition.toArray().every(Number.isFinite));
 assert(Math.abs(pose.mechanismRotation.length()-1)<1e-8);
 assert.equal(pose.mechanismScale,.68);
 // The annotated rail face remains visible in this interval of the reference.
 const normal=new THREE.Vector3(0,0,1).applyQuaternion(pose.mechanismRotation);
 assert(normal.z>.3,`Unobserved grazing/back-facing pose at ${t}`);
}
assert.deepEqual(filmPose(RESET_TIME),filmPose(0));
assert.equal(filmPose(8.75).filmOpacity,.2013);
assert.equal(filmPose(8.9).filmOpacity,0);
console.log(JSON.stringify({status:'passed',scope:'Rigid 3D pose / annotated point projection / fade and reset. Not a pixel-fidelity pass.',samples:results},null,2));
