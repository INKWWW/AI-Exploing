import * as THREE from 'three';
import { sampledMechanism } from './mechanism-motion.js';
import { sampledKeyboard } from './keyboard-motion.js';
import keyboardExit from './keyboard-exit.json' with {type:'json'};

export const DURATION=9;
export const RESET_TIME=8.966667;
export const clamp=(v)=>Math.max(0,Math.min(1,v));
export const smooth=(a,b,t)=>{const k=clamp((t-a)/(b-a));return k*k*(3-2*k);};
function track(t,frames){
  if(t<=frames[0][0])return frames[0][1];
  for(let i=1;i<frames.length;i++)if(t<=frames[i][0]){const [a,x]=frames[i-1],[b,y]=frames[i];const u=(t-a)/(b-a);return THREE.MathUtils.lerp(x,y,u);}
  return frames.at(-1)[1];
}
function monotonicTrack(t,frames){
  if(t<=frames[0][0])return frames[0][1];
  if(t>=frames.at(-1)[0])return frames.at(-1)[1];
  const slopes=frames.slice(1).map((f,i)=>(f[1]-frames[i][1])/(f[0]-frames[i][0]));
  const tangent=i=>i===0||i===frames.length-1?0:slopes[i-1]*slopes[i]<=0?0:2/(1/slopes[i-1]+1/slopes[i]);
  const i=frames.findIndex(f=>f[0]>t)-1,[a,x]=frames[i],[b,y]=frames[i+1],dt=b-a,u=(t-a)/dt,u2=u*u,u3=u2*u;
  return (2*u3-3*u2+1)*x+(u3-2*u2+u)*dt*tangent(i)+(-2*u3+3*u2)*y+(u3-u2)*dt*tangent(i+1);
}
const deg=THREE.MathUtils.degToRad;
const qz=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-Math.PI/2);
const orientation=(yaw,tilt)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(0,deg(yaw),deg(tilt),'ZYX')).multiply(qz);

/** Absolute-time poses: seeking backwards produces exactly the same geometry. */
export function filmPose(time){
  const t=time>=RESET_TIME?0:time;
  const zoom=smooth(1.12,2.88,t);
  // Fits the visible last key column near x=534px at 4.5s and x=392px
  // at 5s in the 960px reference, rather than removing the body too early.
  const keyboardX=monotonicTrack(t,keyboardExit);
  const measured=sampledMechanism(t),blend=smooth(2.5,3.25,t);
  const keyboardSample=sampledKeyboard(t);
  const keyboardPosition=keyboardSample.position.lerp(new THREE.Vector3(.1,.025,0),smooth(3.25,4.05,t)).add(new THREE.Vector3(keyboardX-.1,0,0));
  const keyboardRotation=keyboardSample.quaternion.slerp(orientation(51,0),smooth(3.25,4.05,t));
  return {
    t,
    height:THREE.MathUtils.lerp(4.1,3.0,zoom)+.35*smooth(7.1,8,t),
    keyboardPosition,
    keyboardRotation,
    mechanismPosition:keyboardPosition.clone().add(new THREE.Vector3(0,0,-.22).applyQuaternion(keyboardRotation)).lerp(measured.position,blend),
    mechanismRotation:keyboardRotation.clone().slerp(measured.quaternion,blend),
    mechanismScale:THREE.MathUtils.lerp(.68,measured.scale,blend),
    capLift:monotonicTrack(t,[[2.25,0],[2.5,.3843],[2.75,.6953],[3.02,1.3],[3.18,1.7]]),
    capVisible:t<3.02,
    keyboardVisible:t<5.5,
    mechanismVisible:t>2.2,
    // Screen-space intensity measured in a fixed 130x205px reference ROI.
    // A film fade is compositing, not a change to material exposure/lighting.
    filmOpacity:track(t,[[0,1],[8.25,1],[8.5,.723],[8.7,.2767],[8.725,.2767],[8.75,.2013],[8.775,.0949],[8.8,.0949],[8.825,.0651],[8.85,.0098],[8.875,0],[RESET_TIME,0]]),
  };
}
