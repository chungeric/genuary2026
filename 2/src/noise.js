// Generated using https://threejs.org/examples/webgpu_tsl_transpiler.html
// Three.js Transpiler r182

import { mod, Fn, mul, sub, vec2, vec4, dot, floor, step, min, max, float, abs, vec3 } from 'three/tsl';

//Simplex 3D Noise 
//by Ian McEwan, Stefan Gustavson (https://github.com/stegu/webgl-noise)
//

export const permute = /*@__PURE__*/ Fn( ( [ x ] ) => {

	return mod( x.mul( 34.0 ).add( 1.0 ).mul( x ), 289.0 );

}, { x: 'vec4', return: 'vec4' } );

export const taylorInvSqrt = /*@__PURE__*/ Fn( ( [ r ] ) => {

	return sub( 1.79284291400159, mul( 0.85373472095314, r ) );

}, { r: 'vec4', return: 'vec4' } );

export const snoise = /*@__PURE__*/ Fn( ( [ v ] ) => {

	const C = vec2( 1.0 / 6.0, 1.0 / 3.0 );
	const D = vec4( 0.0, 0.5, 1.0, 2.0 );

	// First corner

	const i = floor( v.add( dot( v, C.yyy ) ) );
	const x0 = v.sub( i ).add( dot( i, C.xxx ) );

	// Other corners

	const g = step( x0.yzx, x0.xyz );
	const l = sub( 1.0, g );
	const i1 = min( g.xyz, l.zxy );
	const i2 = max( g.xyz, l.zxy );

	//  x0 = x0 - 0. + 0.0 * C 

	const x1 = x0.sub( i1 ).add( mul( 1.0, C.xxx ) );
	const x2 = x0.sub( i2 ).add( mul( 2.0, C.xxx ) );
	const x3 = x0.sub( 1. ).add( mul( 3.0, C.xxx ) );

	// Permutations

	i.assign( mod( i, 289.0 ) );
	const p = permute( permute( permute( i.z.add( vec4( 0.0, i1.z, i2.z, 1.0 ) ) ).add( i.y ).add( vec4( 0.0, i1.y, i2.y, 1.0 ) ) ).add( i.x ).add( vec4( 0.0, i1.x, i2.x, 1.0 ) ) );

	// Gradients
	// ( N*N points uniformly over a square, mapped onto an octahedron.)

	const n_ = float( 1.0 / 7.0 );

	// N=7

	const ns = n_.mul( D.wyz ).sub( D.xzx );
	const j = p.sub( mul( 49.0, floor( p.mul( ns.z ).mul( ns.z ) ) ) );

	//  mod(p,N*N)

	const x_ = floor( j.mul( ns.z ) );
	const y_ = floor( j.sub( mul( 7.0, x_ ) ) );

	// mod(j,N)

	const x = x_.mul( ns.x ).add( ns.yyyy );
	const y = y_.mul( ns.x ).add( ns.yyyy );
	const h = sub( 1.0, abs( x ) ).sub( abs( y ) );
	const b0 = vec4( x.xy, y.xy );
	const b1 = vec4( x.zw, y.zw );
	const s0 = floor( b0 ).mul( 2.0 ).add( 1.0 );
	const s1 = floor( b1 ).mul( 2.0 ).add( 1.0 );
	const sh = step( h, vec4( 0.0 ) ).negate();
	const a0 = b0.xzyw.add( s0.xzyw.mul( sh.xxyy ) );
	const a1 = b1.xzyw.add( s1.xzyw.mul( sh.zzww ) );
	const p0 = vec3( a0.xy, h.x );
	const p1 = vec3( a0.zw, h.y );
	const p2 = vec3( a1.xy, h.z );
	const p3 = vec3( a1.zw, h.w );

	//Normalise gradients

	const norm = taylorInvSqrt( vec4( dot( p0, p0 ), dot( p1, p1 ), dot( p2, p2 ), dot( p3, p3 ) ) );
	p0.mulAssign( norm.x );
	p1.mulAssign( norm.y );
	p2.mulAssign( norm.z );
	p3.mulAssign( norm.w );

	// Mix final noise value

	const m = max( sub( 0.6, vec4( dot( x0, x0 ), dot( x1, x1 ), dot( x2, x2 ), dot( x3, x3 ) ) ), 0.0 );
	m.assign( m.mul( m ) );

	return mul( 42.0, dot( m.mul( m ), vec4( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 ), dot( p3, x3 ) ) ) );

}, { v: 'vec3', return: 'float' } );
