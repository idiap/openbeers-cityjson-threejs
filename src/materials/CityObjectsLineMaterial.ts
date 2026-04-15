//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
// SPDX-FileContributor: Stelios Vitalis (from cityjson-threejs-loader)
//
// SPDX-License-Identifier: Apache-2.0
//

// ---

import { 
	CityObjectsBaseMaterial,
	CityObjectsMaterialParameters,
	CityObjectShader,
	city_object_include_vertex,
	city_object_diffuse_vertex,
	city_object_show_lod_vertex,
	city_object_uniforms
 } from "./CityObjectsBaseMaterial";
import { UniformsUtils } from "three";
import 'three/examples/jsm/lines/LineMaterial';

// ---

export class CityObjectsLineMaterial extends CityObjectsBaseMaterial {

    line_width : number;
    world_units : boolean;

    constructor( 
		shader : CityObjectShader,
		parameters : CityObjectsMaterialParameters
	) {
		const new_shader = { ...shader };
		new_shader.uniforms = {
			...UniformsUtils.clone( city_object_uniforms ),
			...UniformsUtils.clone( shader.uniforms ),
		};
		new_shader.extensions = {
			derivatives: true,
		};
		new_shader.lights = false;
		new_shader.vertexShader =
			city_object_include_vertex +
			new_shader.vertexShader.replace(
				/#include <fog_vertex>/,
				`
				#include <fog_vertex>
				`
				+ city_object_diffuse_vertex
				+ city_object_show_lod_vertex
			);
		new_shader.fragmentShader =
			`
				varying vec3 diffuse_;
				varying float discard_;
			` +
			new_shader.fragmentShader.replace(
				/vec4 diffuse_color = vec4\( diffuse, alpha \);/,
				`
				vec4 diffuse_color = vec4( diffuse_, alpha );

				#ifdef SHOW_LOD
					if ( discard_ > 0.0 ) {
						discard;
					}
				#endif
				`
			);
		super( new_shader );
		this.line_width = 0.001;
		this.world_units = false;
		Object.defineProperties( this, {
			color: {
				enumerable: true,
				get: function () {
					return this.uniforms.diffuse.value;
				},
				set: function ( value ) {
					this.uniforms.diffuse.value = value;
				}
			},

			world_units: {
				enumerable: true,
				get: function () : boolean {
					return 'WORLD_UNITS' in this.defines;
				},
				set: function ( value : boolean ) {
					if ( value === true ) {
						this.defines.WORLD_UNITS = '';
					} else {
						delete this.defines.WORLD_UNITS;
					}
				}
			},

			line_width: {
				enumerable: true,
				get: function () {
					return this.uniforms.linewidth.value;
				},
				set: function ( value ) {
					this.uniforms.linewidth.value = value;
				}
			},

			dashed: {
				enumerable: true,
				get: function () : boolean {
					return Boolean( 'USE_DASH' in this.defines );
				},
				set( value : boolean ) {
					if ( Boolean( value ) !== Boolean( 'USE_DASH' in this.defines ) ) {
						this.needs_update = true;
					}
					if ( value === true ) {
						this.defines.USE_DASH = '';
					} else {
						delete this.defines.USE_DASH;
					}
				}
			},

			dash_scale: {
				enumerable: true,
				get: function () {
					return this.uniforms.dash_scale.value;
				},
				set: function ( value ) {
					this.uniforms.dash_scale.value = value;
				}
			},

			dash_size: {
				enumerable: true,
				get: function () {
					return this.uniforms.dash_size.value;
				},
				set: function ( value ) {
					this.uniforms.dash_size.value = value;
				}
			},

			dash_offset: {
				enumerable: true,
				get: function () {
					return this.uniforms.dash_offset.value;
				},
				set: function ( value ) {
					this.uniforms.dash_offset.value = value;
				}
			},

			gap_size: {
				enumerable: true,
				get: function () {
					return this.uniforms.gap_size.value;
				},
				set: function ( value ) {
					this.uniforms.gap_size.value = value;
				}
			},

			opacity: {
				enumerable: true,
				get: function () {
					return this.uniforms.opacity.value;
				},
				set: function ( value ) {
					this.uniforms.opacity.value = value;
				}
			},

			resolution: {
				enumerable: true,
				get: function () {
					return this.uniforms.resolution.value;
				},
				set: function ( value ) {
					this.uniforms.resolution.value.copy( value );
				}
			},

			alpha_to_coverage: {
				enumerable: true,
				get: function () : boolean {
					return Boolean( 'USE_ALPHA_TO_COVERAGE' in this.defines );
				},
				set: function ( value : boolean ) {
					if ( Boolean( value ) !== Boolean( 'USE_ALPHA_TO_COVERAGE' in this.defines ) ) {
						this.needs_update = true;
					}
					if ( value === true ) {
						this.defines.USE_ALPHA_TO_COVERAGE = '';
						this.extensions.derivatives = true;
					} else {
						delete this.defines.USE_ALPHA_TO_COVERAGE;
						this.extensions.derivatives = false;
					}
				}
			}
		} );
		this.setValues( parameters );
	}
}

// ---
