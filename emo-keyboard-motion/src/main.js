import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { makeKeyboard,makeMechanism } from './model.js';
import { filmPose,DURATION,RESET_TIME } from './motion.js';

const $=id=>document.getElementById(id);
const video=$('reference'),timeline=$('timeline'),canvas=$('scene'),stage=$('render-stage');
let renderer,scene,camera,controls,keyboard,mechanism,ambient,keyLight,fillLight,rimLight;
let freeView=false,loop=true,renderedTime=0,lastUi=-1,frameCallback=false;
let sceneReady=false,wasPlayingBeforeScrub=false,scrubbing=false;
let size={width:1,height:1};
let userInteracted=false;
for(const event of ['pointerdown','keydown','input'])document.addEventListener(event,()=>{userInteracted=true;},{once:true,capture:true});
const formatTime=t=>{const n=Math.round(t*100);return `00:${Math.floor(n/100).toString().padStart(2,'0')}.${(n%100).toString().padStart(2,'0')}`;};
const descriptions=[
  ['每一处细节，都有自己的运动。','黑色键帽、金属边框与窄边机身，在侧光中逐渐显现。'],
  ['键帽之下，精密显露。','视线推近，银色框架与弹簧从黑色键帽下显现。'],
  ['从整体中，抽离一个细节。','机械结构脱离安装位，键盘向侧面移出画面。'],
  ['让结构，自己说话。','悬浮旋转的金属组件，呈现框架、连杆与弹簧的层次。'],
];

function setup(){
  RectAreaLightUniformsLib.init();
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor(0x000000);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  scene=new THREE.Scene();
  const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.06);scene.environment=environment.texture;scene.environmentIntensity=.43;room.dispose();pmrem.dispose();
  camera=new THREE.PerspectiveCamera(15,.566,0.02,100);camera.position.set(0,0,8);camera.lookAt(0,0,0);
  ambient=new THREE.HemisphereLight(0xe7ebf0,0x272725,.75);scene.add(ambient);
  keyLight=new THREE.DirectionalLight(0xffffff,2.8);keyLight.position.set(-3,5,6);keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);keyLight.shadow.camera.left=-3;keyLight.shadow.camera.right=3;keyLight.shadow.camera.top=3;keyLight.shadow.camera.bottom=-3;keyLight.shadow.camera.near=.1;keyLight.shadow.camera.far=30;keyLight.shadow.camera.updateProjectionMatrix();keyLight.shadow.normalBias=.003;keyLight.shadow.bias=-.0001;scene.add(keyLight);
  fillLight=new THREE.DirectionalLight(0xdbe2e7,.65);fillLight.position.set(4,-1,3);scene.add(fillLight);
  rimLight=new THREE.DirectionalLight(0xffffff,1.5);rimLight.position.set(-2,-4,-1);scene.add(rimLight);
  const strip=new THREE.RectAreaLight(0xffffff,5,1,9);strip.position.set(4,2,4);strip.lookAt(0,0,0);scene.add(strip);
  keyboard=makeKeyboard();mechanism=makeMechanism();mechanism.scale.setScalar(.83);scene.add(keyboard.group,mechanism);
  controls=new OrbitControls(camera,canvas);controls.enabled=false;controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=40;
  new ResizeObserver(resize).observe(stage);resize();sceneReady=true;$('renderer-status').textContent='WEBGL / LIVE';
  updatePose(0);render();
}
function resize(){
  const r=stage.getBoundingClientRect();size={width:Math.max(1,r.width),height:Math.max(1,r.height)};
  renderer.setSize(size.width,size.height,false);
  if(freeView){camera.aspect=size.width/size.height;camera.updateProjectionMatrix();}
  if(sceneReady){updatePose(renderedTime);render();}
}
function updatePose(time){
  if(!sceneReady||freeView)return;
  const p=filmPose(time);keyboard.group.position.copy(p.keyboardPosition);keyboard.group.quaternion.copy(p.keyboardRotation);keyboard.group.visible=p.keyboardVisible;
  keyboard.selected.position.z=.025+p.capLift;keyboard.selected.visible=p.capVisible;
  mechanism.scale.setScalar(p.mechanismScale);mechanism.position.copy(p.mechanismPosition);mechanism.quaternion.copy(p.mechanismRotation);mechanism.visible=p.mechanismVisible;
  camera.position.set(0,0,p.height/(2*Math.tan(THREE.MathUtils.degToRad(7.5))));camera.lookAt(0,0,0);camera.aspect=306/539;camera.updateProjectionMatrix();
  renderer.toneMappingExposure=1.0;
  canvas.style.opacity=String(p.filmOpacity);
}
function render(){
  if(!sceneReady)return;
  renderer.setScissorTest(false);renderer.setViewport(0,0,size.width,size.height);renderer.clear();
  if(!freeView){
    // The supplied recording contains a 306:539 portrait render centered in a 960:539 video.
    const h=Math.min(size.height,size.width*539/960),w=h*306/539;
    const x=(size.width-w)/2,y=(size.height-h)/2;renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);renderer.setScissorTest(true);
  }
  renderer.render(scene,camera);renderer.setScissorTest(false);
}
function updateUI(time){
  const duration=Math.min(DURATION,Number.isFinite(video.duration)?video.duration:DURATION);
  timeline.max=String(duration);if(!scrubbing)timeline.value=String(time);
  timeline.style.setProperty('--progress',`${time/duration*100}%`);timeline.setAttribute('aria-valuetext',`${time.toFixed(2)} 秒，共 ${duration.toFixed(2)} 秒`);
  if(document.activeElement!==$('current-time'))$('current-time').value=time.toFixed(2);$('duration').textContent=formatTime(duration);
  const t=time>=RESET_TIME?0:time;const chapter=t<2.55?0:t<3.6?1:t<5.5?2:3;
  document.querySelectorAll('.chapter').forEach((el,i)=>el.classList.toggle('active',i===chapter));
  $('chapter-title').textContent=descriptions[chapter][0];$('chapter-description').textContent=descriptions[chapter][1];
  canvas.dataset.renderTime=renderedTime.toFixed(4);canvas.dataset.view=freeView?'free':'film';
}
function showTime(time){time=Math.min(DURATION,Math.max(0,time));renderedTime=time;updatePose(time);updateUI(time);render();}
function scheduleVideoFrame(){
  if(!('requestVideoFrameCallback' in video))return;
  frameCallback=true;
  video.requestVideoFrameCallback((_now,meta)=>{showTime(meta.mediaTime);scheduleVideoFrame();});
}
function animate(){
  requestAnimationFrame(animate);
  if(freeView){controls?.update();render();}
  else if(!frameCallback&&!video.paused){showTime(video.currentTime);}
  if(Math.abs(video.currentTime-lastUi)>.07){updateUI(video.currentTime);lastUi=video.currentTime;}
}
function updatePlay(){
  const paused=video.paused;$('play').innerHTML=paused?'▶<span>播放</span>':'Ⅱ<span>暂停</span>';$('play').setAttribute('aria-label',paused?'播放':'暂停');
}
async function play(){try{await video.play();}catch{$('sync-state').innerHTML='<i></i>点击播放以开始';}updatePlay();}
function seek(time){
  const duration=Math.min(DURATION,Number.isFinite(video.duration)?video.duration:DURATION);
  video.currentTime=Math.min(duration-.001,Math.max(0,time));showTime(video.currentTime);
}
function setView(free){
  freeView=free;controls.enabled=free;
  const shadowExtent=free?10:3;keyLight.shadow.camera.left=-shadowExtent;keyLight.shadow.camera.right=shadowExtent;keyLight.shadow.camera.top=shadowExtent;keyLight.shadow.camera.bottom=-shadowExtent;keyLight.shadow.camera.updateProjectionMatrix();$('film-view').classList.toggle('selected',!free);$('model-view').classList.toggle('selected',free);
  $('film-view').setAttribute('aria-pressed',String(!free));$('model-view').setAttribute('aria-pressed',String(free));
  $('view-hint').textContent=free?'拖动右侧键盘旋转，滚轮缩放。':'点击「自由观察」，拖动右侧键盘查看 3D。';
  $('sync-state').innerHTML=free?'<i></i>自由观察模式':'<i></i>同步时间轴';
  $('render-label').textContent=free?'ORBIT / DRAG TO EXPLORE':'REAL-TIME / THREE.JS';
  if(free){
    camera.fov=28;
    canvas.style.opacity='1';
    video.pause();keyboard.group.visible=true;keyboard.group.position.set(0,0,0);keyboard.group.rotation.set(0,0,0);keyboard.selected.visible=true;keyboard.selected.position.z=.025;mechanism.visible=false;
    controls.target.set(0,0,0);camera.position.set(2,-14,18);camera.up.set(0,1,0);camera.aspect=size.width/size.height;camera.updateProjectionMatrix();controls.update();renderer.toneMappingExposure=1.1;
  }else{camera.fov=15;controls.target.set(0,0,0);camera.up.set(0,1,0);showTime(video.currentTime);}
  render();
}

try{setup();scheduleVideoFrame();animate();}catch(error){
  console.error(error);$('renderer-status').textContent='WEBGL 不可用';$('scene-error').hidden=false;$('scene-error').textContent='无法初始化三维画面。请启用浏览器硬件加速后刷新页面。';
  $('model-view').disabled=true;$('film-view').disabled=true;
}
$('play').addEventListener('click',()=>video.paused?play():video.pause());
$('restart').addEventListener('click',()=>{seek(0);play();});
$('speed').addEventListener('change',e=>{video.playbackRate=Number(e.target.value);});
$('loop').addEventListener('click',()=>{loop=!loop;$('loop').setAttribute('aria-pressed',String(loop));$('loop').innerHTML=`循环 <span>${loop?'ON':'OFF'}</span>`;});
$('sound').addEventListener('click',()=>{video.muted=!video.muted;$('sound').textContent=video.muted?'静音':'有声';$('sound').setAttribute('aria-label',video.muted?'开启原片声音':'关闭原片声音');});
timeline.addEventListener('pointerdown',()=>{wasPlayingBeforeScrub=!video.paused;scrubbing=true;video.pause();});
timeline.addEventListener('input',()=>seek(Number(timeline.value)));
function finishScrub(){if(!scrubbing)return;scrubbing=false;if(wasPlayingBeforeScrub)play();}
window.addEventListener('pointerup',finishScrub);window.addEventListener('pointercancel',finishScrub);
document.querySelectorAll('.chapter').forEach(button=>button.addEventListener('click',()=>seek(Number(button.dataset.time))));
$('film-view').addEventListener('click',()=>sceneReady&&setView(false));$('model-view').addEventListener('click',()=>sceneReady&&setView(true));
$('expand').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen();}catch{$('view-hint').textContent='当前浏览器不支持全屏，可使用浏览器缩放查看。';}});
video.addEventListener('play',updatePlay);video.addEventListener('pause',updatePlay);
video.addEventListener('loadedmetadata',()=>{updateUI(video.currentTime);});
video.addEventListener('seeked',()=>showTime(video.currentTime));
video.addEventListener('ended',()=>{if(loop){seek(0);play();}else updatePlay();});
video.addEventListener('error',()=>{$('sync-state').textContent='原片加载失败，请刷新重试';});
document.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.target.tagName))return;
  if(e.code==='Space'){e.preventDefault();video.paused?play():video.pause();}
  if(e.code==='ArrowRight'){e.preventDefault();video.pause();seek(video.currentTime+1/30);}
  if(e.code==='ArrowLeft'){e.preventDefault();video.pause();seek(video.currentTime-1/30);}
});
// Muted autoplay; reduced-motion users keep the aligned, paused first frame.
updatePlay();

if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  if(video.readyState>=3)play();
  else video.addEventListener('canplay',()=>{if(!userInteracted)play();},{once:true});
}

function commitPreciseTime(){
  userInteracted=true;
  const value=$('current-time').valueAsNumber;
  if(Number.isFinite(value)){video.pause();seek(value);}else updateUI(video.currentTime);
}
$('current-time').addEventListener('change',commitPreciseTime);
$('current-time').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commitPreciseTime();$('current-time').blur();}});
