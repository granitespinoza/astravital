// AI assistance: OpenAI Codex. Illustrative geometry, not patient anatomy or imaging.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

export function createScene(container,{onDomain=()=>{},onEnter=()=>{}}={}){
 let renderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}
 catch{container.innerHTML='<div class="scene-fallback">3D is unavailable. The status display, voice and controls still work.</div>';return{setMode(){},setDomain(){},setState(){},enterWearerView:async()=>{},dispose(){}};}
 container.replaceChildren(renderer.domElement);
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(33,1,.1,100);camera.position.set(0,.2,9.5);
 const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment(),env=pmrem.fromScene(environment,.04);scene.environment=env.texture;
 scene.add(new THREE.HemisphereLight(0xb6e8e7,0x030507,2));
 const key=new THREE.DirectionalLight(0xe5ffff,3.4);key.position.set(-3,4,5);scene.add(key);
 const rim=new THREE.PointLight(0x83ccc9,38);rim.position.set(3,1,-2);scene.add(rim);
 const V=a=>new THREE.Vector3(...a);
 const mat=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.45,...opts});
 const bone=mat(0xc9e3df,{metalness:.28,roughness:.32});
 const joint=mat(0x92b3b2,{metalness:.15});
 const outline=new THREE.LineBasicMaterial({color:0x78a9ae,transparent:true,opacity:.19});
 const body=new THREE.Group();body.position.set(0,-.38,0);scene.add(body);
 const meshes=[];
 function oval(parent,r,scale,pos,material){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,24,18),material);mesh.scale.set(...scale);mesh.position.set(...pos);parent.add(mesh);meshes.push(mesh);return mesh;}
 function rod(parent,a,b,r,material=bone){const start=V(a),end=V(b),dir=end.clone().sub(start);const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(r,Math.max(.001,dir.length()-2*r),6,12),material);mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());parent.add(mesh);meshes.push(mesh);return mesh;}
 function curve(parent,points,r,material=bone,closed=false){const path=new THREE.CatmullRomCurve3(points.map(V),closed);const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,56,r,8,closed),material);parent.add(mesh);meshes.push(mesh);return mesh;}
 function lineLoop(points,material=outline){const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points.map(V)),material);body.add(line);return line;}
 // Minimal spatial body map: only the two measured systems carry visual emphasis.
 const shape=new THREE.Shape();
 shape.moveTo(-.12,1.55);shape.bezierCurveTo(-.16,1.43,-.40,1.48,-.47,1.30);
 shape.bezierCurveTo(-.56,1.08,-.64,.55,-.70,.10);shape.quadraticCurveTo(-.72,-.05,-.62,-.08);
 shape.quadraticCurveTo(-.56,-.10,-.54,.06);shape.lineTo(-.39,.95);
 shape.bezierCurveTo(-.33,.74,-.30,.42,-.36,.13);shape.quadraticCurveTo(-.42,-.07,-.39,-.32);
 shape.lineTo(-.30,-1.81);shape.quadraticCurveTo(-.36,-1.92,-.31,-1.98);shape.lineTo(-.12,-1.98);shape.quadraticCurveTo(-.07,-1.97,-.10,-1.87);
 shape.lineTo(-.13,-1.02);shape.lineTo(-.10,-.42);shape.quadraticCurveTo(0,-.30,.10,-.42);
 shape.lineTo(.13,-1.02);shape.lineTo(.10,-1.87);shape.quadraticCurveTo(.07,-1.97,.12,-1.98);shape.lineTo(.31,-1.98);shape.quadraticCurveTo(.36,-1.92,.30,-1.81);
 shape.lineTo(.39,-.32);shape.quadraticCurveTo(.42,-.07,.36,.13);shape.bezierCurveTo(.30,.42,.33,.74,.39,.95);
 shape.lineTo(.54,.06);shape.quadraticCurveTo(.56,-.10,.62,-.08);shape.quadraticCurveTo(.72,-.05,.70,.10);
 shape.bezierCurveTo(.64,.55,.56,1.08,.47,1.30);shape.bezierCurveTo(.40,1.48,.16,1.43,.12,1.55);shape.closePath();
 const shell=new THREE.MeshPhysicalMaterial({color:0x325052,metalness:.25,roughness:.35,transparent:true,opacity:.20,side:THREE.DoubleSide,depthWrite:false});
 const human=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.17,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:4,steps:1,curveSegments:20}),shell);body.add(human);
 const edge=new THREE.LineBasicMaterial({color:0x91bcb6,transparent:true,opacity:.55});
 const contour=shape.getPoints(150).map(v=>new THREE.Vector3(v.x,v.y,.2));body.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(contour),edge));
 oval(body,.21,[.83,1.18,.72],[0,1.88,.04],shell);
 const headOutline=new THREE.EllipseCurve(0,1.88,.175,.245,0,Math.PI*2).getPoints(80).map(v=>new THREE.Vector3(v.x,v.y,.2));body.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(headOutline),edge));
 const heartMat=mat(0xedc1b6,{emissive:0xc56f5c,emissiveIntensity:.7,metalness:.15,roughness:.3});
 const h=new THREE.Shape();h.moveTo(0,-.13);h.bezierCurveTo(-.30,.05,-.13,.25,0,.10);h.bezierCurveTo(.13,.25,.30,.05,0,-.13);
 const heart=new THREE.Mesh(new THREE.ExtrudeGeometry(h,{depth:.045,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:3,steps:1,curveSegments:24}),heartMat);heart.position.set(.13,1.04,.21);heart.scale.setScalar(.65);body.add(heart);
 const hipMat=mat(0xc7e5d5,{emissive:0x729c87,emissiveIntensity:.5});
 const hip=new THREE.Group();hip.position.set(.25,-.16,.23);body.add(hip);
 // AI assistance: Anthropic Claude. Thicker femur, femoral head and a pelvic wing so the bone zone reads at a glance.
 oval(hip,.1,[1.3,.82,.42],[-.09,.15,0],hipMat);rod(hip,[.025,-.04,0],[0,-.59,0],.042,hipMat);rod(hip,[.025,-.04,0],[-.06,.035,0],.034,hipMat);oval(hip,.062,[1,1,1],[-.07,.05,0],hipMat);oval(hip,.05,[1.45,.8,1],[0,-.62,0],hipMat);hip.userData.domain='bone';
 // Both measured zones carry a halo, a ring and a label; the selected one pulses.
 const halo=(pos,scale,color)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.2,24,16),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false}));m.position.set(...pos);m.scale.set(...scale);body.add(m);return m;};
 const heartHalo=halo([.13,1.04,.22],[1.25,1.25,.5],0xff8f7e),boneHalo=halo([.22,-.38,.22],[.85,2.1,.5],0x9ff0cf);
 const ring=(pos,r,scaleY,color)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(r,.006,6,72),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.3,depthWrite:false}));m.position.set(...pos);m.scale.y=scaleY;body.add(m);return m;};
 const heartRing=ring([.13,1.04,.34],.21,1,0xf6b3a7),boneRing=ring([.22,-.36,.34],.2,2.2,0xb8e8d8);
 const labelTextures=[];
 function label(text,x,y,fromX,color){const c=document.createElement('canvas');c.width=512;c.height=96;const g=c.getContext('2d');g.font='600 40px "Fira Sans", sans-serif';g.fillStyle=color;g.textBaseline='middle';g.fillText(text,6,50);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;labelTextures.push(tex);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));sprite.center.set(0,.5);sprite.scale.set(1.35,.253,1);sprite.position.set(x,y,.3);body.add(sprite);const lead=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V([fromX,y,.3]),V([x-.04,y,.3])]),new THREE.LineBasicMaterial({color,transparent:true,opacity:.5}));body.add(lead);return{sprite,lead};}
 const heartLabel=label('HEART',.8,1.04,.32,'#f6c3b8'),boneLabel=label('BONES · LEFT HIP',.62,-.36,.34,'#c9f0df');
 const invisible=new THREE.MeshBasicMaterial({visible:false});const heartHit=oval(body,.22,[1,1,1],[.13,1.04,.26],invisible);heartHit.userData.domain='cardiovascular';const hipHit=oval(body,.25,[1,1.3,1],[.25,-.36,.26],invisible);hipHit.userData.domain='bone';
 body.position.set(.50,-.30,0);
 // Premium optical hardware visualization, independent of the wearer-view HUD.
 const glasses=new THREE.Group();glasses.rotation.set(.13,-.42,-.04);scene.add(glasses);
 const graphite=mat(0x080b0e,{metalness:.85,roughness:.21}),silver=mat(0x718080,{metalness:1,roughness:.18});
 const lens=new THREE.MeshPhysicalMaterial({color:0x9ac2cc,transmission:.9,roughness:.05,metalness:.04,thickness:.08,transparent:true,opacity:.65,ior:1.5,side:THREE.DoubleSide});
 function box(w,h,d,m,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);glasses.add(mesh);return mesh;}
 function round(w,h,r){const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;}
 for(const s of[-1,1]){
  const outer=round(2,1.28,.31),inner=round(1.74,1.04,.25);outer.holes.push(new THREE.Path(inner.getPoints().reverse()));
  const frame=new THREE.Mesh(new THREE.ExtrudeGeometry(outer,{depth:.16,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:4,steps:1}),graphite);frame.position.x=s*1.08;glasses.add(frame);
  const optic=new THREE.Mesh(new THREE.ShapeGeometry(round(1.76,1.06,.25)),lens);optic.position.set(s*1.08,0,.045);glasses.add(optic);
  const temple=box(.15,.22,2.25,graphite,s*2.07,.36,-1.03);temple.rotation.y=-s*.1;
  box(.18,.025,.48,silver,s*2.1,.485,-.18);
  for(let n=0;n<5;n++)box(.015,.025,.08,silver,s*2.1,.49,-.65-n*.09);
  box(.032,.05,.05,silver,s*2.1,.34,-.11);
 }
 box(.34,.15,.17,graphite,0,.21,.06);
 const screen=document.createElement('canvas');screen.width=768;screen.height=384;const ink=screen.getContext('2d'),texture=new THREE.CanvasTexture(screen);texture.colorSpace=THREE.SRGBColorSpace;
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.42,.71),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.88,depthWrite:false}));panel.position.set(1.08,-.025,.185);glasses.add(panel);
 // AI assistance: Anthropic Claude. A ripple around the display lens invites the first tap.
 const invite=new THREE.Mesh(new THREE.TorusGeometry(.98,.012,8,96),new THREE.MeshBasicMaterial({color:0xb8e8d8,transparent:true,opacity:0,depthWrite:false}));invite.position.set(1.08,-.025,.21);invite.scale.y=.62;invite.visible=false;glasses.add(invite);
 let current;
 function drawHud(){ink.clearRect(0,0,768,384);if(!current)return;const level=current.quality!=='ok'?'NO DATA':current.domain==='bone'?'CHECK':current.state==='ok'?'STABLE':current.state==='alert'?'REVIEW':'CHECK';const c=level==='STABLE'?'#9bd8b0':level==='REVIEW'?'#f6a39a':'#e8c983';ink.fillStyle='#04100de6';ink.beginPath();ink.roundRect(18,18,732,348,32);ink.fill();ink.strokeStyle='#80b5ac';ink.lineWidth=2;ink.stroke();ink.fillStyle='#a7c6c1';ink.font='26px sans-serif';ink.fillText('ASTRA / '+(current.domain==='bone'?'BONES':'HEART'),48,83);ink.fillStyle=c;ink.beginPath();ink.arc(61,145,9,0,Math.PI*2);ink.fill();ink.font='bold 54px sans-serif';ink.fillText(level,90,164);ink.fillStyle='#e0f5ec';ink.font='28px sans-serif';ink.fillText(level==='STABLE'?'Within your demo reference.':'Let’s check this together.',48,240);ink.fillStyle='#9cb7ad';ink.font='24px sans-serif';ink.fillText('LOCAL · SIMULATED DATA',48,309);texture.needsUpdate=true;}
 // A quiet horizon keeps the center of the optical display unobstructed.
 const world=new THREE.Group();scene.add(world);
 const grid=new THREE.GridHelper(60,34,0x123139,0x0c181d);grid.position.set(0,-3.3,-6);grid.material.transparent=true;grid.material.opacity=.42;world.add(grid);
 const stars=[];let seed=142;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let i=0;i<230;i++)stars.push((random()-.5)*45,random()*19-2,-15-random()*12);
 const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));world.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0x91aeb9,size:.017,transparent:true,opacity:.55})));
 const horizon=new THREE.Mesh(new THREE.SphereGeometry(18,96,48),new THREE.MeshBasicMaterial({color:0x0b171c}));horizon.position.set(12,-20,-30);world.add(horizon);
 const arc=new THREE.Mesh(new THREE.TorusGeometry(18,.015,6,128),new THREE.MeshBasicMaterial({color:0x405e65,transparent:true,opacity:.35}));arc.position.copy(horizon.position);arc.rotation.x=.06;world.add(arc);
 const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableZoom=false;orbit.enablePan=false;orbit.enableDamping=true;orbit.minPolarAngle=Math.PI*.35;orbit.maxPolarAngle=Math.PI*.64;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let mode='focus',domain='cardiovascular',disposed=false,frameId,transition;
 function setMode(next){if(transition){const done=transition.done;transition=null;done();}camera.fov=33;camera.updateProjectionMatrix();lens.opacity=.65;mode=next;body.visible=next==='body';glasses.visible=next==='glasses'||next==='intro';world.visible=next==='focus';orbit.enabled=next!=='focus';camera.position.set(0,.2,next==='body'?10.5:9.5);orbit.target.set(0,0,0);orbit.update();}
 function setDomain(next){domain=next;const heartOn=next==='cardiovascular';heartMat.emissiveIntensity=heartOn?.9:.35;hipMat.emissiveIntensity=heartOn?.35:.95;heartLabel.sprite.material.opacity=heartOn?1:.55;boneLabel.sprite.material.opacity=heartOn?.55:1;heartLabel.lead.material.opacity=heartOn?.7:.25;boneLabel.lead.material.opacity=heartOn?.25:.7;}
 function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(container);resize();setMode('focus');setDomain(domain);
 const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();let down;
 const pointerDown=e=>{down=[e.clientX,e.clientY];};
 const click=e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;if(mode==='intro'){onEnter();return;}if(mode!=='body')return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects([heartHit,hipHit])[0];if(hit)onDomain(hit.object.userData.domain);};
 renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('click',click);
 function enterWearerView(){if(reduced){setMode('focus');return Promise.resolve();}setMode('glasses');world.visible=true;orbit.enabled=false;glasses.updateMatrixWorld(true);const eye=glasses.localToWorld(new THREE.Vector3(1.08,-.025,.58)),aim=glasses.localToWorld(new THREE.Vector3(1.08,-.025,-2));return new Promise(done=>{transition={start:performance.now(),duration:2400,from:camera.position.clone(),fov:camera.fov,eye,aim,done};});}
 const clock=new THREE.Clock();function animate(){if(disposed)return;frameId=requestAnimationFrame(animate);const t=clock.getElapsedTime();if(transition){const a=transition,p=Math.min(1,(performance.now()-a.start)/a.duration),e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;invite.visible=false;camera.position.lerpVectors(a.from,a.eye,e);const target=new THREE.Vector3().lerpVectors(new THREE.Vector3(0,0,0),a.aim,e);camera.lookAt(target);camera.fov=a.fov+(24-a.fov)*e;camera.updateProjectionMatrix();lens.opacity=.65*(1-Math.min(1,Math.max(0,(p-.6)/.3)));panel.material.opacity=.88*(1-Math.max(0,(p-.6)/.4));if(p>=1){transition=null;panel.material.opacity=.88;setMode('focus');a.done();}}else{const heartOn=domain==='cardiovascular';invite.visible=mode==='intro';if(!reduced){glasses.position.y=(mode==='intro'?.85:.07)+Math.sin(t*.6)*.035;heart.scale.setScalar(1+Math.sin(t*2.1)*.025);const k=(t*.8)%1;invite.scale.set(1+k*.14,(1+k*.14)*.62,1);invite.material.opacity=.6*(1-k);const pulse=.5+.5*Math.sin(t*2.4);(heartOn?heartRing:boneRing).material.opacity=.45+.4*pulse;(heartOn?boneRing:heartRing).material.opacity=.18;(heartOn?heartHalo:boneHalo).material.opacity=.1+.12*pulse;(heartOn?boneHalo:heartHalo).material.opacity=.05;}else{invite.material.opacity=.4;heartRing.material.opacity=heartOn?.8:.2;boneRing.material.opacity=heartOn?.2:.8;}orbit.update();}renderer.render(scene,camera);}animate();
 return{setMode,setDomain,enterWearerView,setState(state){current=state;setDomain(state.domain);drawHud();},dispose(){disposed=true;cancelAnimationFrame(frameId);observer.disconnect();orbit.dispose();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('click',click);scene.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});texture.dispose();labelTextures.forEach(x=>x.dispose());env.dispose();environment.dispose();pmrem.dispose();renderer.dispose();}};
}
