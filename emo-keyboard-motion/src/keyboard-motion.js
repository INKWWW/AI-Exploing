import * as THREE from 'three';
import measurements from './keyboard-track.json' with { type: 'json' };

const log = q => {
  const length=Math.hypot(q.x,q.y,q.z);
  return length<1e-9?new THREE.Vector3():new THREE.Vector3(q.x,q.y,q.z).multiplyScalar(Math.atan2(length,q.w)/length);
};
const exp = v => {
  const length=v.length(),s=length<1e-9?1:Math.sin(length)/length;
  return new THREE.Quaternion(v.x*s,v.y*s,v.z*s,Math.cos(length)).normalize();
};
const frames=measurements.map(f=>({...f,p:new THREE.Vector3(...f.position),q:new THREE.Quaternion(...f.quaternion).normalize()}));
for(let i=0;i<frames.length;i++){
  const f=frames[i],prev=frames[Math.max(0,i-1)],next=frames[Math.min(frames.length-1,i+1)];
  f.velocity=next.p.clone().sub(prev.p).divideScalar(next.time-prev.time||1);
  const inverse=f.q.clone().invert();
  const before=prev===f?new THREE.Vector3():log(inverse.clone().multiply(prev.q)).divideScalar(f.time-prev.time).negate();
  const after=next===f?new THREE.Vector3():log(inverse.clone().multiply(next.q)).divideScalar(next.time-f.time);
  f.angularVelocity=before.add(after).multiplyScalar(.5);
}
// The final pose settles before the source film fades out.
frames.at(-1).velocity.set(0,0,0);frames.at(-1).angularVelocity.set(0,0,0);
const mix=(a,b,t)=>new THREE.Quaternion().slerpQuaternions(a,b,t);

/** A constant-size rigid assembly: translation + full 3-axis orientation. */
export function sampledKeyboard(time){
  const exact=frames.find(f=>f.time===time);
  if(exact)return {position:exact.p.clone(),quaternion:exact.q.clone(),scale:exact.scale};
  if(time<=frames[0].time)return {position:frames[0].p.clone(),quaternion:frames[0].q.clone(),scale:frames[0].scale};
  if(time>=frames.at(-1).time){const f=frames.at(-1);return {position:f.p.clone(),quaternion:f.q.clone(),scale:f.scale};}
  const end=frames.findIndex(f=>f.time>time),a=frames[end-1],b=frames[end],dt=b.time-a.time,u=(time-a.time)/dt;
  const u2=u*u,u3=u2*u;
  const position=a.p.clone().multiplyScalar(2*u3-3*u2+1)
    .addScaledVector(a.velocity,(u3-2*u2+u)*dt)
    .addScaledVector(b.p,-2*u3+3*u2)
    .addScaledVector(b.velocity,(u3-u2)*dt);
  // Spherical cubic Bezier with time-scaled tangents avoids a yaw-only spin
  // and avoids stopping at every measured keyframe.
  const c1=a.q.clone().multiply(exp(a.angularVelocity.clone().multiplyScalar(dt/3)));
  const c2=b.q.clone().multiply(exp(b.angularVelocity.clone().multiplyScalar(-dt/3)));
  const ab=mix(a.q,c1,u),bc=mix(c1,c2,u),cd=mix(c2,b.q,u);
  return {position,quaternion:mix(mix(ab,bc,u),mix(bc,cd,u),u),scale:a.scale};
}
