import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const black = new THREE.MeshPhysicalMaterial({color:0x222222,metalness:0.18,roughness:0.44,clearcoat:0.06,clearcoatRoughness:0.35,specularIntensity:0.45});
// Keycaps are slightly lighter than the side housing in the reference close-up.
const keycapMaterial = black.clone();
keycapMaterial.color.setHex(0x1c2023);
keycapMaterial.roughness = .28;
keycapMaterial.clearcoat = .22;
keycapMaterial.clearcoatRoughness = .2;
keycapMaterial.specularIntensity = .8;
const rim = new THREE.MeshStandardMaterial({color:0x34383a,metalness:0.86,roughness:0.3});
const rubber = new THREE.MeshStandardMaterial({color:0x050607,roughness:0.8});
const silver = new THREE.MeshStandardMaterial({color:0xc9ced0,metalness:0.62,roughness:0.24});
const polished = new THREE.MeshStandardMaterial({color:0xe9ecea,metalness:0.93,roughness:0.17});
const white = new THREE.MeshStandardMaterial({color:0xe1e2de,metalness:0.08,roughness:0.34});
const actuatorMetal=white.clone();actuatorMetal.color.setHex(0xb7b9b6);actuatorMetal.roughness=.38;actuatorMetal.metalness=.55;
const darkMetal = new THREE.MeshStandardMaterial({color:0x696c6c,metalness:0.87,roughness:0.3});

function box(parent,w,h,d,x,y,z,material,radius=0.02){
  const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(radius,d/2,h/2,w/2)),material);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function rod(parent,start,end,r,material){
  const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),delta=b.clone().sub(a);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),12),material);
  mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());mesh.castShadow=true;parent.add(mesh);return mesh;
}
function screw(parent,x,y,z,r=.022){
  const head=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.013,16),polished);head.rotation.x=Math.PI/2;head.position.set(x,y,z);parent.add(head);
  box(parent,r*1.25,.0035,.002,x,y,z+.008,darkMetal,.001);
}

/** Rounded, tapered cap with a depressed top; dimensions in key-pitch units. */
function capGeometry(width,height,compact=false){
  const points=[],indices=[];const steps=8;
  const rings=compact?[{inset:0,z:0,r:.10},{inset:.009,z:.035,r:.105},{inset:.022,z:.135,r:.10},{inset:.040,z:.165,r:.09},{inset:.10,z:.160,r:.07},{inset:.31,z:.158,r:.035}]:[{inset:0,z:0,r:.075},{inset:.005,z:.022,r:.078},{inset:.012,z:.075,r:.079},{inset:.027,z:.091,r:.078},{inset:.080,z:.087,r:.066},{inset:.31,z:.085,r:.035}];
  for(const ring of rings){
    const w=width/2-ring.inset,h=height/2-Math.min(ring.inset,height*.3),r=Math.min(ring.r,h*.7,w*.7);
    for(let c=0;c<4;c++){
      const cx=c===0||c===3?w-r:-w+r,cy=c<2?h-r:-h+r;
      for(let i=0;i<=steps;i++){
        const angle=(c*90+i/steps*90)*Math.PI/180;
        points.push(cx+Math.cos(angle)*r,cy+Math.sin(angle)*r,ring.z*.72);
      }
    }
  }
  const n=4*(steps+1);
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<n;k++){
    const a=j*n+k,b=j*n+(k+1)%n,c=(j+1)*n+k,d=(j+1)*n+(k+1)%n;indices.push(a,b,c,b,d,c);
  }
  const center=points.length/3;points.push(0,0,(compact?.158:.085)*.72);
  for(let k=0;k<n;k++)indices.push((rings.length-1)*n+k,(rings.length-1)*n+(k+1)%n,center);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

function legendTexture(text,isNumber=false){
  const c=document.createElement('canvas');c.width=256;c.height=256;const ctx=c.getContext('2d');
  ctx.fillStyle='#b1b5b5';ctx.strokeStyle='#b1b5b5';ctx.textAlign='center';ctx.textBaseline='middle';
  if(isNumber){ctx.font='200 171px "Helvetica Neue",Arial,sans-serif';ctx.lineWidth=1.55;ctx.strokeText(text,128,145);ctx.font='26px Arial';ctx.fillText({1:'!',2:'@',3:'#',4:'$',5:'%',6:'^',7:'&',8:'*',9:'(',0:')'}[text]||'',128,38);}
  else if(/^[A-Z]$/.test(text)){ctx.font='200 90px "Helvetica Neue",Arial,sans-serif';ctx.fillText(text,128,137);}
  else{ctx.font=`${text.length>3?25:text.length>1?37:71}px "Helvetica Neue",Arial,sans-serif`;ctx.fillText(text,128,137);}
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}

function casingSlab(parent,w,h,d,cx,cy,z,material,radius){
  const shape=new THREE.Shape(),r=radius,x0=cx-w/2,x1=cx+w/2,y0=cy-h/2,y1=cy+h/2;
  shape.moveTo(x0+r,y0);shape.lineTo(x1-r,y0);shape.quadraticCurveTo(x1,y0,x1,y0+r);
  shape.lineTo(x1,y1-r);shape.quadraticCurveTo(x1,y1,x1-r,y1);
  shape.lineTo(x0+r,y1);shape.quadraticCurveTo(x0,y1,x0,y1-r);
  shape.lineTo(x0,y0+r);shape.quadraticCurveTo(x0,y0,x0+r,y0);
  const hole=new THREE.Path();hole.moveTo(-.51,-.51);hole.lineTo(-.51,.51);hole.lineTo(.51,.51);hole.lineTo(.51,-.51);hole.closePath();shape.holes.push(hole);
  const bevel=Math.min(.007,d/4);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:12});
  const mesh=new THREE.Mesh(geometry,material);mesh.position.z=z-d/2+bevel;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
}

export function makeKeyboard(){
  const group=new THREE.Group();const surface=new THREE.Group();group.add(surface);
  casingSlab(surface,15.65,5.67,.26,-.2,.45,-.26,black,.11);
  casingSlab(surface,15.58,5.61,.028,-.2,.45,-.116,rim,.012);
  casingSlab(surface,15.43,5.49,.07,-.2,.45,-.073,black,.03);
  box(surface,15.55,.018,.02,-.2,-2.345,-.32,rim,.005);
  for(const x of [-6.7,6.25])for(const y of [-1.85,2.8])box(surface,.6,.28,.06,x,y,-.418,rubber,.025);
  let selected;
  const geometryCache=new Map();
  function key(label,x,y,w=1,h=1,number=false){
    const isFunction=label==='esc'||/^F\d+$/.test(label);
    const k=new THREE.Group();k.position.set(x,y,isFunction?.045:.025);surface.add(k);
    box(k,w-.025,h-.035,.04,0,0,-.02,rubber,.019);
    const name=`${w},${h},${isFunction}`;if(!geometryCache.has(name))geometryCache.set(name,capGeometry(w-.065,h-.065,isFunction));
    const cap=new THREE.Mesh(geometryCache.get(name),keycapMaterial);cap.castShadow=true;cap.receiveShadow=true;k.add(cap);
    if(label){const m=new THREE.MeshBasicMaterial({map:legendTexture(label,number),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
      const legend=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w-.17,.76),h-.17),m);legend.position.z=isFunction?.119:.066;k.add(legend);}
    if(label==='H')selected=k;
    return k;
  }
  // The H switch is the origin so the close-up and the extracted assembly share a pivot.
  const letters=(labels,start,y)=>labels.forEach((label,i)=>key(label,start+i,y));
  letters(['A','S','D','F','G','H','J','K','L',';',"'"],-5,0);
  key('caps lock',-6.43,0,1.8);key('return',6.4,0,1.75);
  letters(['Q','W','E','R','T','Y','U','I','O','P','[',']'],-5.375,1);
  key('tab',-6.62,1,1.5);key('\\',6.73,1,1.35);
  letters(['Z','X','C','V','B','N','M',',','.','/'],-4.75,-1);
  key('shift',-6.44,-1,2.8);key('shift',6.03,-1,2.2);
  ['1','2','3','4','5','6','7','8','9','0','−','='].forEach((n,i)=>key(n,-5.75+i,2,1,1,i<10));
  key('`',-6.75,2);key('delete',6.64,2,1.7);
  for(let i=0;i<13;i++)key(i===0?'esc':`F${i}`,-6.13918861+i*.951635329,2.85,.91,.61);
  key('ctrl',-6.75,-2,1.0,.87);key('fn',-5.7,-2,1,.87);key('⌥',-4.65,-2,1,.87);key('⌘',-3.6,-2,1,.87);
  key('',-.02,-2,6.03,.87);key('⌘',3.56,-2,1,.87);key('⌥',4.61,-2,1,.87);
  key('←',5.7,-2,1,.87);key('↑',6.75,-1.77,1,.40);key('↓',6.75,-2.22,1,.40);
  box(surface,.5,.56,.14,6.95,2.89,.06,black,.045);
  const stemPoints=[new THREE.Vector2(.29,0),new THREE.Vector2(.27,.10),new THREE.Vector2(.18,.19),new THREE.Vector2(.12,.34),new THREE.Vector2(.075,.53)];
  const stem=new THREE.Mesh(new THREE.LatheGeometry(stemPoints,32),black);stem.rotation.x=Math.PI/2;stem.position.set(6.95,2.89,.12);surface.add(stem);
  box(surface,.16,.18,.10,6.95,2.89,.69,new THREE.MeshStandardMaterial({color:0xdd2f10,roughness:.3}),.025);
  box(surface,.47,.09,.045,6.55,-2.38,-.27,rubber,.021);
  // Metal mounting well remains behind when the mechanism leaves the keyboard.
  box(surface,1.02,1.02,.028,0,0,-.29,darkMetal,.025);
  box(surface,.73,.75,.016,0,0,-.267,rubber,.012);
  for(const x of [-.42,.42])for(const y of [-.40,.40])screw(surface,x,y,-.258,.018);
  return {group,selected};
}

export function makeMechanism(){
  const g=new THREE.Group();
  // Back plate: a stamped open rectangular frame rather than an opaque block.
  for(const x of [-.47,.47])box(g,.065,.96,.035,x,0,0,darkMetal,.009);
  for(const y of [-.46,.46])box(g,.96,.095,.025,0,y,0,darkMetal,.007);
  for(const x of [-.43,.43])box(g,.095,.95,.038,x,0,.10,silver,.012);
  for(const y of [-.415,.415])box(g,.84,.057,.031,0,y,.097,polished,.008);
  // Reference side views show one uninterrupted rear opening.
  // The earlier guessed central cross-braces incorrectly split it into slots.
  // Raised end rails, folded lips, brackets, and retaining tabs.
  for(const x of [-.47,.47]){
    const sign=Math.sign(x);
    // One stamped sheet with two real elongated spring-anchor apertures.
    // Dimensions are estimated from the full-resolution 8 s reference frame.
    const trayOutline=new THREE.Shape();
    trayOutline.moveTo(.29,-.46);trayOutline.lineTo(.40,-.505);
    trayOutline.lineTo(.53,-.505);trayOutline.lineTo(.53,.505);
    trayOutline.lineTo(.40,.505);trayOutline.lineTo(.29,.46);trayOutline.closePath();
    for(const y of [-.048,.048]){
      const hole=new THREE.Path();hole.absellipse(.36,y,.056,.021,0,Math.PI*2,true);
      trayOutline.holes.push(hole);
    }
    const trayGeometry=new THREE.ExtrudeGeometry(trayOutline,{depth:.018,bevelEnabled:false,curveSegments:16});
    const trayPositions=trayGeometry.attributes.position;
    for(let i=0;i<trayPositions.count;i++){
      const x=trayPositions.getX(i),t=THREE.MathUtils.clamp((x-.29)/.14,0,1);
      trayPositions.setZ(i,trayPositions.getZ(i)+.15+.07*t*t*(3-2*t));
    }
    trayGeometry.computeVertexNormals();
    const tray=new THREE.Mesh(trayGeometry,white);tray.scale.x=sign;
    tray.castShadow=true;tray.receiveShadow=true;g.add(tray);
    // A thin folded hem, open underneath, replaces the solid edge bar.
    // Sweeping this half-circle along the tray reproduces its rounded return
    // and the continuous specular band visible in the end-on reference.
    const hemSection=new THREE.Shape();
    hemSection.absarc(.50,.18,.052,Math.PI/2,-Math.PI/2,true);
    hemSection.lineTo(.50,.142);
    hemSection.absarc(.50,.18,.038,-Math.PI/2,Math.PI/2,false);
    hemSection.closePath();
    const hemGeometry=new THREE.ExtrudeGeometry(hemSection,{depth:.94,bevelEnabled:false,curveSegments:20});
    const hem=new THREE.Mesh(hemGeometry,polished);hem.rotation.x=Math.PI/2;hem.scale.x=sign;hem.position.y=.47;
    hem.castShadow=true;hem.receiveShadow=true;g.add(hem);
    box(g,.022,.89,.014,x-Math.sign(x)*.047,0,.225,polished,.005);
    for(const y of [-.40,.40]){
      box(g,.14,.075,.052,x,y,.056,silver,.01);
      rod(g,[x-.055,y,.12],[x+.055,y,.12],.034,polished);
      screw(g,x,y,.229,.025);
      const hook=box(g,.088,.035,.031,x+Math.sign(x)*.033,y,.249,silver,.006);hook.rotation.y=Math.sign(x)*.4;
    }
    for(const y of [-.29,.29]){
      box(g,.045,.056,.008,x,y,.226,darkMetal,.01);
      box(g,.053,.061,.016,x-Math.sign(x)*.062,y,.20,silver,.006);
    }
  }
  // Paired white actuator leaves, separated by the long steel return spring.
  for(const y of [-.178,.178]){
    box(g,.69,.245,.024,0,y,.140,y<0?silver:actuatorMetal,.007);
    if(y<0)box(g,.22,.245,.020,-.235,y,.161,actuatorMetal,.004);
    box(g,.66,.015,.024,0,y+Math.sign(y)*.099,.158,silver,.004);
    box(g,.60,.007,.012,0,y-Math.sign(y)*.099,.157,polished,.003);
  }
  box(g,.71,.035,.035,0,0,.158,darkMetal,.005);
  const springPoints=[];const turns=37;
  for(let i=0;i<=turns*14;i++){
    const t=i/(turns*14),a=t*turns*Math.PI*2;springPoints.push(new THREE.Vector3(-.357+t*.714,Math.sin(a)*.048,.206+Math.cos(a)*.048));
  }
  const spring=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPoints),turns*14,.007,8,false),polished);spring.castShadow=true;g.add(spring);
  for(const sign of [-1,1]){
    const hookPoints=[];
    for(let i=0;i<=24;i++){
      const a=-Math.PI/2+i/24*Math.PI*1.55;
      hookPoints.push(new THREE.Vector3(sign*(.355+.057*Math.cos(a)),.048*Math.sin(a),.211));
    }
    const hook=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hookPoints),32,.009,8,false),polished);
    hook.castShadow=true;g.add(hook);
  }
  // The source shows short stamped levers at each end and an open
  // middle span, rather than two full-length bars crossing at the center.
  const leverOutline=new THREE.Shape();
  leverOutline.moveTo(.17,.026);leverOutline.lineTo(.235,.026);
  leverOutline.lineTo(.426,.190);leverOutline.lineTo(.410,.225);
  leverOutline.lineTo(.352,.204);leverOutline.lineTo(.17,.074);
  leverOutline.closePath();
  const leverGeometry=new THREE.ExtrudeGeometry(leverOutline,{depth:.018,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:1,steps:1});
  for(const y of [-.423,.423]){
    for(const sign of [-1,1]){
      const lever=new THREE.Mesh(leverGeometry,silver);
      lever.rotation.x=Math.PI/2;lever.scale.x=sign;lever.position.y=y+.009;
      lever.castShadow=true;lever.receiveShadow=true;g.add(lever);
      rod(g,[sign*.20,y-.022,.047],[sign*.20,y+.022,.047],.016,polished);
      rod(g,[sign*.403,y-.022,.192],[sign*.403,y+.022,.192],.016,polished);
      box(g,.055,.037,.025,sign*.20,y,.027,polished,.004);
    }
  }
  for(const x of [-.335,.335])for(const y of [-.28,.28]){
    const clip=box(g,.09,.025,.095,x,y,.134,polished,.006);clip.rotation.y=x>0?-.4:.4;
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return g;
}
