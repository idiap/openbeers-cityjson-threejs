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

export class CityObjectsPointsMaterial extends CityObjectsBaseMaterial {

    constructor( 
		shader : CityObjectShader,
		parameters : CityObjectsMaterialParameters
	) {
		const new_shader : CityObjectShader = { ...shader };
		new_shader.uniforms = {
			...city_object_uniforms,
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
				/vec4 diffuse_color = vec4\( diffuse, opacity \);/,
				`
				vec4 diffuse_color = vec4( diffuse_, opacity );

				#ifdef SHOW_LOD
					if ( discard_ > 0.0 ) {
						discard;
					}
				#endif
				`
			);
		super( new_shader ); 
		this.setValues( parameters );
	}

	get size() : number {
		return this.uniforms.size.value;
	}

	set size( value : number ) {
		this.uniforms.size.value = value;
	}

	get size_attenuation() : boolean {
		return Boolean( 'USE_SIZE_ATTENUATION' in this.defines );
	}

	set size_attenuation( value : boolean ) {
		if ( Boolean( value ) !== Boolean( 'USE_SIZE_ATTENUATION' in this.defines ) ) {
			this.needs_update = true;
		}
		if ( value === true ) {
			this.defines.USE_SIZE_ATTENUATION = '';
		} else {
			delete this.defines.USE_SIZE_ATTENUATION;
		}
	}
}

// ---
