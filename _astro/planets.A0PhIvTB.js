import{i as e,n as t,r as n,t as r}from"./OutputPass.BLdYbuqF.js";import{C as i,I as a,J as o,K as s,L as c,T as l,U as u,V as d,X as f,Z as p,c as m,d as h,it as g,l as _,n as ee,r as te,rt as v,v as y}from"./preload-helper.aKFUeMeu.js";import{t as ne}from"./motion.Bv6nuicG.js";var b=`
vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
	const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
	const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
	vec3 i = floor(v + dot(v, C.yyy));
	vec3 x0 = v - i + dot(i, C.xxx);
	vec3 g = step(x0.yzx, x0.xyz);
	vec3 l = 1.0 - g;
	vec3 i1 = min(g.xyz, l.zxy);
	vec3 i2 = max(g.xyz, l.zxy);
	vec3 x1 = x0 - i1 + C.xxx;
	vec3 x2 = x0 - i2 + 2.0 * C.xxx;
	vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
	i = mod(i, 289.0);
	vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
	float n_ = 1.0 / 7.0;
	vec3 ns = n_ * D.wyz - D.xzx;
	vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
	vec4 x_ = floor(j * ns.z);
	vec4 y_ = floor(j - 7.0 * x_);
	vec4 x = x_ * ns.x + ns.yyyy;
	vec4 y = y_ * ns.x + ns.yyyy;
	vec4 h = 1.0 - abs(x) - abs(y);
	vec4 b0 = vec4(x.xy, y.xy);
	vec4 b1 = vec4(x.zw, y.zw);
	vec4 s0 = floor(b0) * 2.0 + 1.0;
	vec4 s1 = floor(b1) * 2.0 + 1.0;
	vec4 sh = -step(h, vec4(0.0));
	vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
	vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
	vec3 p0 = vec3(a0.xy, h.x);
	vec3 p1 = vec3(a0.zw, h.y);
	vec3 p2 = vec3(a1.xy, h.z);
	vec3 p3 = vec3(a1.zw, h.w);
	vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
	p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
	vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
	m = m * m;
	return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * snoise(p); p *= 2.02; a *= 0.5; } return v * 0.5 + 0.5; }
float fbm3(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * snoise(p); p *= 2.02; a *= 0.5; } return v * 0.5 + 0.5; }
// Distance to the nearest of a scatter of points: the floor of a crater field.
float cells(vec3 p) {
	vec3 i = floor(p), f = fract(p); float d = 1.0;
	for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
		vec3 o = vec3(x, y, z);
		vec3 r = o + fract(sin(vec3(dot(i + o, vec3(127.1, 311.7, 74.7)), dot(i + o, vec3(269.5, 183.3, 246.1)), dot(i + o, vec3(113.5, 271.9, 124.6)))) * 43758.5453) - f;
		d = min(d, dot(r, r));
	}
	return sqrt(d);
}
`,x=`
varying vec3 vNormal; varying vec3 vPos; varying vec3 vWorld;
void main() {
	vNormal = normalize(mat3(modelMatrix) * normal);
	vPos = position;
	vec4 w = modelMatrix * vec4(position, 1.0);
	vWorld = w.xyz;
	gl_Position = projectionMatrix * viewMatrix * w;
}`,S=`
uniform vec3 cA; uniform vec3 cB; uniform vec3 cC; uniform vec3 cAtmo; uniform vec3 cSpot;
uniform float kind; uniform float bands; uniform float seed; uniform float time; uniform float glow;
uniform float caps; uniform float spot; uniform float hexagon; uniform float heart; uniform float craters; uniform float atmo;
varying vec3 vNormal; varying vec3 vPos; varying vec3 vWorld;
${b}
void main() {
	vec3 p = normalize(vPos);
	vec3 s = p + seed;
	vec3 col; float spec = 0.0;
	if (kind < 0.5) {
		// Rocky: relief, scattered craters, light dust.
		float h = fbm(s * 2.6);
		col = mix(cB, cA, smoothstep(0.3, 0.72, h));
		col = mix(col, cC, smoothstep(0.66, 0.82, fbm(s * 5.0 + 9.0)) * 0.55);
		if (craters > 0.5) {
			float c = cells(s * 7.0);
			col *= 0.78 + 0.22 * smoothstep(0.05, 0.32, c);
			col += cC * 0.12 * smoothstep(0.3, 0.36, c) * (1.0 - smoothstep(0.36, 0.42, c));
		}
		if (caps > 0.5) col = mix(col, vec3(0.95, 0.94, 0.92), smoothstep(0.8, 0.86, abs(p.y) + (fbm(s * 8.0) - 0.5) * 0.12));
		if (heart > 0.5) {
			// Tombaugh Regio, the heart: two pale lobes side by side.
			vec3 c1 = normalize(vec3(0.82, 0.12, 0.56)), c2 = normalize(vec3(0.94, 0.02, 0.2));
			float lobes = max(smoothstep(0.42, 0.25, distance(p, c1)), smoothstep(0.36, 0.2, distance(p, c2)));
			col = mix(col, cC, lobes * (0.8 + 0.2 * fbm(s * 9.0)));
		}
	} else if (kind < 1.5) {
		// Gas giant: latitude bands, warped by turbulence, slowly flowing.
		float w = fbm3(vec3(p.x * 2.0, p.y * 6.0, p.z * 2.0) + seed + vec3(time * 0.015, 0.0, 0.0));
		float b = p.y * 7.5 * bands + w * 2.2;
		float t1 = sin(b * 3.14159) * 0.5 + 0.5;
		float t2 = sin(b * 1.31 + 1.7) * 0.5 + 0.5;
		col = mix(cB, cA, smoothstep(0.15, 0.85, t1));
		col = mix(col, cC, smoothstep(0.6, 1.0, t2) * 0.75);
		col *= 0.9 + 0.2 * fbm3(vec3(p.x * 12.0, p.y * 40.0, p.z * 12.0) + seed);
		if (spot > 0.5) {
			// The great storm: an oval, swirled.
			vec3 sc = normalize(vec3(0.72, -0.32, 0.62));
			vec3 d = p - sc;
			float e = length(vec2(length(d.xz) * 0.85, d.y * 2.1));
			float swirl = fbm3(p * 14.0 + e * 6.0);
			col = mix(col, mix(cSpot, cC, swirl * 0.5), smoothstep(0.24, 0.12, e));
		}
		if (hexagon > 0.5 && p.y > 0.6) {
			// Saturn's hexagon, around the north pole.
			vec2 q = p.xz / (1.0 + p.y);
			vec2 a = abs(q);
			float hex = max(a.x * 0.866 + a.y * 0.5, a.y);
			col = mix(col, cB * 0.75, smoothstep(0.028, 0.0, abs(hex - 0.2)) * 0.8);
			col = mix(col, mix(cB, vec3(0.55, 0.62, 0.7), 0.5), smoothstep(0.2, 0.12, hex) * 0.5);
		}
	} else if (kind < 2.5) {
		// Ice giant: smooth, faintly banded, with high white streaks.
		float b = sin(p.y * 9.0 * bands + fbm3(s * 2.0) * 1.2) * 0.5 + 0.5;
		col = mix(cB, cA, b * 0.6 + 0.3);
		float streak = smoothstep(0.62, 0.8, fbm3(vec3(p.x * 2.5, p.y * 22.0, p.z * 2.5) + seed + time * 0.01));
		col = mix(col, cC, streak * 0.7);
		if (spot > 0.5) {
			vec3 d = p - normalize(vec3(0.6, -0.38, 0.7));
			float e = length(vec2(length(d.xz) * 0.9, d.y * 1.8));
			col = mix(col, cSpot, smoothstep(0.17, 0.08, e) * 0.85);
		}
		spec = 0.35;
	} else {
		// Under clouds: thick, folded, slowly turning.
		vec3 q = s * 1.8;
		q += vec3(fbm3(q + time * 0.02), fbm3(q + 4.0), fbm3(q + 8.0)) * 1.6;
		float c = fbm(q);
		col = mix(cB, cA, smoothstep(0.25, 0.75, c));
		col = mix(col, cC, smoothstep(0.6, 0.85, c) * 0.8);
		spec = 0.12;
	}
	// Lit by the sun at the centre of the system: a soft terminator, a cold night side, the air glowing at the rim.
	vec3 N = normalize(vNormal);
	vec3 L = normalize(-vWorld);
	vec3 V = normalize(cameraPosition - vWorld);
	float ndl = dot(N, L);
	float day = smoothstep(-0.18, 0.55, ndl);
	vec3 sun = vec3(1.0, 0.95, 0.86);
	vec3 c = col * (0.035 + 0.95 * day) * sun;
	c += sun * spec * pow(max(dot(reflect(-L, N), V), 0.0), 28.0) * day;
	float rim = pow(1.0 - max(dot(N, V), 0.0), 2.6);
	c += cAtmo * rim * atmo * (0.15 + 1.1 * smoothstep(-0.35, 0.5, ndl));
	c += col * glow * 0.22 + cAtmo * glow * rim * 0.6;
	gl_FragColor = vec4(c, 1.0);
}`,re=`
uniform vec3 cAtmo; uniform float strength;
varying vec3 vNormal; varying vec3 vWorld;
void main() {
	vec3 N = normalize(vNormal);
	vec3 V = normalize(cameraPosition - vWorld);
	float rim = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 3.5);
	float day = smoothstep(-0.4, 0.6, dot(N, normalize(-vWorld)));
	gl_FragColor = vec4(cAtmo * rim * day * strength, rim * day * strength);
}`,ie=`
uniform float time;
varying vec3 vNormal; varying vec3 vPos; varying vec3 vWorld;
${b}
void main() {
	vec3 p = normalize(vPos);
	float n = fbm(p * 3.0 + vec3(time * 0.05, time * 0.03, 0.0));
	float g = fbm3(p * 12.0 - time * 0.08);
	vec3 deep = vec3(1.0, 0.42, 0.1), hot = vec3(1.0, 0.82, 0.48), white = vec3(1.0, 0.97, 0.88);
	vec3 col = mix(deep, hot, smoothstep(0.3, 0.75, n));
	col = mix(col, white, smoothstep(0.62, 0.9, g) * 0.6);
	float mu = max(dot(normalize(vNormal), normalize(cameraPosition - vWorld)), 0.0);
	col *= 0.55 + 0.75 * pow(mu, 0.45);
	gl_FragColor = vec4(col * 2.4, 1.0);
}`,ae=`
varying vec3 vWorld; varying float vR;
uniform float inner; uniform float outer;
void main() {
	vR = (length(position.xy) - inner) / (outer - inner);
	vec4 w = modelMatrix * vec4(position, 1.0);
	vWorld = w.xyz;
	gl_Position = projectionMatrix * viewMatrix * w;
}`,oe=`
uniform vec3 color; uniform vec3 center; uniform float radius; uniform float opacity; uniform float division;
varying vec3 vWorld; varying float vR;
void main() {
	float r = vR;
	float d = 0.6 + 0.25 * sin(r * 58.0) * sin(r * 23.0 + 1.3) + 0.15 * sin(r * 9.0 + 0.5);
	d *= smoothstep(0.0, 0.06, r) * smoothstep(1.0, 0.9, r);
	d *= mix(1.0, smoothstep(0.0, 0.035, abs(r - division)), step(0.01, division));
	// The planet between this point and the sun?
	vec3 toSun = normalize(-vWorld);
	vec3 oc = center - vWorld;
	float t = dot(oc, toSun);
	float miss = length(vWorld + toSun * t - center);
	float shadow = t > 0.0 ? smoothstep(radius * 0.92, radius * 1.04, miss) : 1.0;
	vec3 c = color * (0.12 + 0.95 * shadow);
	gl_FragColor = vec4(c, d * opacity);
}`,se=`
varying vec3 vLocal;
void main() { vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,ce=`
uniform float angle; uniform float glow; uniform vec3 color; uniform float radius; uniform float halfWidth;
varying vec3 vLocal;
void main() {
	float a = atan(vLocal.z, vLocal.x);
	float behind = mod(angle - a + 6.28318, 6.28318);
	float trail = exp(-behind * 1.4);
	// Soft across its width, so that a line thinner than a pixel does not break into dashes.
	float across = 1.0 - smoothstep(0.0, halfWidth, abs(length(vLocal.xz) - radius));
	float alpha = (0.05 + 0.5 * trail + 0.2 * glow) * across;
	gl_FragColor = vec4(color * (0.8 + trail), alpha);
}`,le=`
attribute float size; attribute float phase; attribute vec3 tint;
uniform float time; uniform float pixel;
varying vec3 vTint; varying float vTw;
void main() {
	vTint = tint;
	vTw = 0.65 + 0.35 * sin(time * (0.6 + phase) + phase * 40.0);
	vec4 mv = modelViewMatrix * vec4(position, 1.0);
	gl_PointSize = size * pixel;
	gl_Position = projectionMatrix * mv;
}`,ue=`
varying vec3 vTint; varying float vTw;
void main() {
	float d = length(gl_PointCoord - 0.5);
	float a = smoothstep(0.5, 0.0, d);
	gl_FragColor = vec4(vTint * vTw, a * a);
}`,de=`
varying vec3 vPos;
${b}
void main() {
	vec3 p = normalize(vPos);
	float n = fbm(p * 2.2 + 3.0);
	float band = exp(-pow(dot(p, normalize(vec3(0.3, 1.0, 0.25))) * 3.2, 2.0));
	vec3 col = mix(vec3(0.012, 0.014, 0.03), vec3(0.045, 0.028, 0.085), smoothstep(0.45, 0.85, n) * (0.4 + band));
	col += vec3(0.02, 0.05, 0.09) * smoothstep(0.55, 0.9, fbm(p * 4.0 + 11.0)) * band;
	gl_FragColor = vec4(col, 1.0);
}`,fe={rocky:0,gas:1,ice:2,cloud:3};function C(b,C,w){let T=new ee(b,{fov:30,env:!1,alpha:!1}),{scene:E,camera:D,renderer:O}=T;E.background=new h(`#060709`),O.domElement.style.touchAction=`pan-y`;let k=new e(O);k.addPass(new n(E,D));let pe=new t(new v(256,256),.55,.45,1.05);k.addPass(pe),k.addPass(new r),T.render=()=>k.render();let A={value:0},me=new l(new o(180,48,32),new s({vertexShader:`varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:de,side:1,depthWrite:!1}));E.add(me);let j=2600,M=new Float32Array(j*3),N=new Float32Array(j),P=new Float32Array(j),F=new Float32Array(j*3),I=[[1,.97,.9],[.8,.88,1],[1,.85,.7],[1,1,1]];for(let e=0;e<j;e++){let t=new g().randomDirection().multiplyScalar(90+Math.random()*70);M.set([t.x,t.y,t.z],e*3),N[e]=Math.random()<.04?3.2+Math.random()*2.5:1+Math.random()*1.6,P[e]=Math.random(),F.set(I[Math.random()*I.length|0],e*3)}let L=new _;L.setAttribute(`position`,new m(M,3)),L.setAttribute(`size`,new m(N,1)),L.setAttribute(`phase`,new m(P,1)),L.setAttribute(`tint`,new m(F,3));let R=new s({uniforms:{time:A,pixel:{value:O.getPixelRatio()}},vertexShader:le,fragmentShader:ue,transparent:!0,depthWrite:!1,blending:2});E.add(new a(L,R));let z=new y;E.add(z);let he=new l(new o(.72,64,64),new s({uniforms:{time:A},vertexShader:x,fragmentShader:ie}));z.add(he);for(let[e,t]of[[2.6,`rgba(255,190,110,0.22)`],[6,`rgba(255,150,70,0.06)`]]){let n=new f(new p({map:te(t,`rgba(255,120,40,0)`),blending:2,depthWrite:!1}));n.scale.setScalar(e),z.add(n)}let B=1800,V=new Float32Array(B*3);for(let e=0;e<B;e++){let t=Math.random()*Math.PI*2,n=4.38+(Math.random()+Math.random()-1)*.22;V.set([Math.cos(t)*n,(Math.random()-.5)*.08,Math.sin(t)*n],e*3)}let H=new _;H.setAttribute(`position`,new m(V,3));let U=new a(H,new c({size:.035,color:10326144,transparent:!0,opacity:.55,depthWrite:!1}));z.add(U);let ge=e=>new s({vertexShader:x,fragmentShader:S,uniforms:{cA:{value:new h(`#a49c92`)},cB:{value:new h(`#5d5852`)},cC:{value:new h(`#cfc8bd`)},cAtmo:{value:new h(`#000000`)},cSpot:{value:new h(`#000000`)},kind:{value:0},bands:{value:0},seed:{value:e},time:A,glow:{value:0},caps:{value:0},spot:{value:0},hexagon:{value:0},heart:{value:0},craters:{value:1},atmo:{value:0}}}),W=C.map((e,t)=>{let n=e.features??{},r={angle:{value:0},glow:{value:0},color:{value:new h(`#e6b766`)},radius:{value:e.orbit},halfWidth:{value:.035}},i=new u(e.orbit-.035,e.orbit+.035,512,1);i.rotateX(-Math.PI/2);let a=new l(i,new s({uniforms:r,vertexShader:se,fragmentShader:ce,transparent:!0,depthWrite:!1,side:2,blending:2}));z.add(a);let c=new y,d={cA:{value:new h(e.colors[0])},cB:{value:new h(e.colors[1])},cC:{value:new h(e.colors[2])},cAtmo:{value:new h(e.atmo??`#000000`)},cSpot:{value:new h(n.spot??`#000000`)},kind:{value:fe[e.kind]},bands:{value:e.bands},seed:{value:t*7.31},time:A,glow:{value:0},caps:{value:+!!n.caps},spot:{value:+!!n.spot},hexagon:{value:+!!n.hexagon},heart:{value:+!!n.heart},craters:{value:+!!n.craters},atmo:{value:+!!e.atmo}},f=new l(new o(e.radius,96,96),new s({uniforms:d,vertexShader:x,fragmentShader:S}));if(f.rotation.z=e.tilt??.25,f.userData.id=e.id,c.add(f),e.atmo){let t=new l(new o(e.radius*1.09,64,64),new s({uniforms:{cAtmo:d.cAtmo,strength:{value:.9}},vertexShader:x,fragmentShader:re,transparent:!0,depthWrite:!1,blending:2}));c.add(t)}let p=null;if(e.ring){let t=e.radius*e.ring.inner,n=e.radius*e.ring.outer;p=new s({uniforms:{inner:{value:t},outer:{value:n},color:{value:new h(e.ring.color)},center:{value:new g},radius:{value:e.radius},opacity:{value:e.id===`saturne`?.9:.55},division:{value:e.id===`saturne`?.62:0}},vertexShader:ae,fragmentShader:oe,transparent:!0,depthWrite:!1,side:2});let r=new l(new u(t,n,192,4),p);r.rotation.x=-Math.PI/2+e.ring.tilt,c.add(r)}let m=(e.moons??[]).map((n,r)=>{let i=new y;i.rotation.x=.15*(r%2?1:-1);let a=new l(new o(n,32,32),ge(t*3.1+r));return a.position.x=e.radius*(1.6+r*.42)+n*2,i.add(a),c.add(i),{holder:i,speed:.9/(1+r*.6),phase:r*2.1}});return z.add(c),{pl:e,pivot:c,body:f,orbitUniforms:r,uniforms:d,ringMat:p,moons:m,angle:t/C.length*Math.PI*2+t*.9,speed:.2/Math.sqrt(e.orbit),hover:0}}),G=document.createElement(`div`);G.className=`planet-tag`,G.innerHTML=`<span class="pt-name"></span><span class="pt-god"></span><span class="pt-go">Voir le monde →</span>`,b.appendChild(G);let _e=e=>{let t=W.find(t=>t.pl.id===e);G.classList.toggle(`on`,!!t),t&&(G.querySelector(`.pt-name`).textContent=t.pl.name,G.querySelector(`.pt-god`).textContent=`${t.pl.god} · ${t.pl.title}`)},K=null,q=null,ve=new d,ye=new v,J={x:0,y:0},Y={yaw:.4,pitch:.42,wYaw:.035,wPitch:0},X={on:!1,x:0,y:0,t:0,v:0,vp:0,dist:0},Z=null,be=e=>{let t=b.getBoundingClientRect();ye.set((e.clientX-t.left)/t.width*2-1,-((e.clientY-t.top)/t.height)*2+1),ve.setFromCamera(ye,D);let n=ve.intersectObjects(W.map(e=>e.body))[0];return n?n.object.userData.id:null},xe=e=>{e!==K&&(K=e,w.onHover(e),_e(e??q))},Se=e=>{ne()||!T.running?w.onPick(e):Z={t:0,from:D.position.clone(),id:e}};b.addEventListener(`pointerdown`,e=>{e.button===0&&(b.setPointerCapture(e.pointerId),Object.assign(X,{on:!0,x:e.clientX,y:e.clientY,t:performance.now(),v:0,vp:0,dist:0}),Y.wYaw=0,Y.wPitch=0)}),b.addEventListener(`pointermove`,e=>{let t=b.getBoundingClientRect();if(J.x=(e.clientX-t.left)/t.width*2-1,J.y=(e.clientY-t.top)/t.height*2-1,X.on){let t=performance.now(),n=Math.max(.008,(t-X.t)/1e3),r=e.clientX-X.x,a=e.clientY-X.y;X.dist+=Math.abs(r)+Math.abs(a),Y.yaw+=r*.006,Y.pitch=i.clamp(Y.pitch+a*.004,.08,1.1),X.v+=(r*.006/n-X.v)*.5,X.vp+=(a*.004/n-X.vp)*.5,Object.assign(X,{x:e.clientX,y:e.clientY,t}),X.dist>6&&(b.style.cursor=`grabbing`),T.once();return}let n=be(e);xe(n),b.style.cursor=n?`pointer`:`grab`}),b.addEventListener(`pointerup`,e=>{if(!X.on)return;if(X.on=!1,b.style.cursor=``,X.dist<6){let t=be(e);t&&Se(t),Y.wYaw=.035;return}let t=performance.now()-X.t>90;Y.wYaw=t?0:i.clamp(X.v,-4,4),Y.wPitch=t?0:i.clamp(X.vp,-2,2)}),b.addEventListener(`pointercancel`,()=>{X.on=!1}),b.addEventListener(`pointerleave`,()=>{X.on||xe(null)});let Ce=0,Q=25;T.onResize((e,t)=>{Q=Math.max(32,31/Math.min(1,e/t)),k.setPixelRatio(O.getPixelRatio()),k.setSize(e,t),R.uniforms.pixel.value=O.getPixelRatio()});let $=new g;return T.onFrame(({t:e,dt:t})=>{A.value=e,!X.on&&t>0&&(Y.wYaw+=(.035-Y.wYaw)*(1-Math.exp(-.8*t)),Y.yaw+=Y.wYaw*t,Y.wPitch*=Math.exp(-3*t),Y.pitch=i.clamp(Y.pitch+Y.wPitch*t,.08,1.1),Y.pitch+=(.42-Y.pitch)*(1-Math.exp(-.5*t))),z.rotation.set(Y.pitch+J.y*.04+Ce*.2,Y.yaw+J.x*.06,0),U.rotation.y+=t*.02;let n=K??q;for(let r of W){let i=+(n===r.pl.id);r.hover+=(i-r.hover)*Math.min(1,t*7),r.angle+=t*r.speed*(1-r.hover*.92),r.pivot.position.set(Math.cos(r.angle)*r.pl.orbit,0,Math.sin(r.angle)*r.pl.orbit),r.pivot.scale.setScalar(1+r.hover*.35),r.body.rotation.y+=t*.18,r.uniforms.glow.value=r.hover,r.orbitUniforms.angle.value=r.angle,r.orbitUniforms.glow.value=r.hover;for(let t of r.moons)t.holder.rotation.y=t.phase+e*t.speed}z.updateMatrixWorld();for(let e of W)e.ringMat&&e.body.getWorldPosition(e.ringMat.uniforms.center.value);if(Z){Z.t+=t/1.1;let e=W.find(e=>e.pl.id===Z.id);e.body.getWorldPosition($);let n=1-(1-Math.min(1,Z.t))**3,r=$.clone().add(new g(0,e.pl.radius*1.2,e.pl.radius*5));if(D.position.lerpVectors(Z.from,r,n),D.lookAt($.clone().multiplyScalar(n)),b.style.opacity=String(1-Math.max(0,Z.t-.6)*2),Z.t>=1){let e=Z.id;Z=null,w.onPick(e)}}else D.position.set(0,0,Q),D.lookAt(0,0,0);let r=W.find(e=>e.pl.id===n);if(r){r.body.getWorldPosition($),$.project(D);let e=18+r.pl.radius*(r.pl.ring?.outer??1.1)*r.pivot.scale.x*(1100/Q),t=($.x*.5+.5)*T.width,n=(-$.y*.5+.5)*T.height,i=t>T.width*.6;G.classList.toggle(`flip`,i),G.style.transform=i?`translate(${t-e}px, ${n}px) translate(-100%, -50%)`:`translate(${t+e}px, ${n}px) translate(0, -50%)`}}),window.addEventListener(`pageshow`,()=>{b.style.opacity=``}),{highlight(e){q=e,_e(K??e),T.once()},setProgress(e){Ce=e}}}export{C as mountPlanets};