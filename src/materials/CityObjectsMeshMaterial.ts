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

// ---

export enum DisplayMode {
  solid = 0,
  solid_lines = 1,
  solid_thick_lines = 2
}

// ---

export class CityObjectsMeshMaterial extends CityObjectsBaseMaterial {

    display_mode : DisplayMode
    threshold_angle : number
    line_thickness : number

    constructor( 
        shader : CityObjectShader,
        parameters : CityObjectsMaterialParameters,
        display_mode : DisplayMode = DisplayMode.solid,
        threshold_angle : number = 45,
        line_thickness : number = 1.5
    ) {
        const new_shader = { ...shader };
        new_shader.uniforms = {
            ...UniformsUtils.clone( city_object_uniforms ),
            ...UniformsUtils.clone( shader.uniforms ),
        };
        new_shader.extensions = {
            derivatives: true,
        };
        new_shader.lights = true;
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

                #ifdef TEXTURE_THEME
                    uniform sampler2D cityTexture;
                    flat in int vTexIndex;
                    varying vec2 vTexUV;
                #endif

                #ifdef MATERIAL_THEME
                    varying vec3 emissive_;
                #endif
            ` +
            new_shader.fragmentShader.replace(
                /vec4 diffuseColor = vec4\( diffuse, opacity \);/,
                `
                vec4 diffuseColor = vec4( diffuse_, opacity );

                #ifdef TEXTURE_THEME
                    if ( vTexIndex > - 1 ) {
                        vec4 tempDiffuseColor = vec4(1.0, 1.0, 1.0, 0.0);
                        tempDiffuseColor = texture2D( cityTexture, vTexUV );
                        diffuseColor *= tempDiffuseColor;
                    }
                #endif

                #ifdef SHOW_LOD
                    if ( discard_ > 0.0 ) {
                        discard;
                    }
                #endif
                `
            ).replace(
                /vec3 totalEmissiveRadiance = emissive;/,
                `
                #ifdef MATERIAL_THEME
                    vec3 totalEmissiveRadiance = emissive_;
                #else
                    vec3 totalEmissiveRadiance = emissive;
                #endif
                `
            );
        super( new_shader );
        this.setValues( parameters );
        this.display_mode = display_mode;
        this.threshold_angle = threshold_angle;
        this.line_thickness = line_thickness;
    }
}

// ---
