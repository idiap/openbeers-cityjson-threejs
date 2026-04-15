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
    Color, 
    ShaderMaterial,
	ShaderMaterialParameters,
	ShaderLibShader,
    IUniform
} from "three";
import { MaterialObject } from 'openbeers'
import { default_selection_color } from './colors'

// ---

export const city_object_uniforms : { [uniform: string]: IUniform } = {

	object_colors: { value: [] },
	surface_colors: { value: [] },
	layer_colors: { value: [] },
	attribute_colors: { value: [] },
	city_materials: { value: [] },
	cityTexture: { value: 't' },
	show_lod: { value: - 1 },
	highlighted_object_id: { value: - 1 },
	highlighted_geometry_id: { value: - 1 },
	highlighted_boundary_id: { value: - 1 },
	highlight_color: { value: new Color( default_selection_color ).convertSRGBToLinear() }

};

// ---

export const city_object_include_vertex : string = `
        uniform vec3 object_colors[ OBJECT_COLOR_COUNT];
        uniform vec3 highlight_color;
        uniform float highlighted_object_id;
        attribute float object_id;
        attribute int object_type;
        varying vec3 diffuse_;

        #ifdef SHOW_SEMANTICS
            uniform vec3 surface_colors[ SEMANTIC_COUNT ];
            attribute int surface_type;
        #endif

		#ifdef SHOW_LAYERS
            uniform vec3 layer_colors[ LAYER_COUNT ];
            attribute int layer_type;
        #endif

		#ifdef COLOR_ATTRIBUTE
            uniform vec3 attribute_colors[ ATTRIBUTE_COUNT ];
            attribute int attributevalue;
        #endif

        #ifdef SELECT_SURFACE
            uniform float highlighted_geometry_id;
            uniform float highlighted_boundary_id;
            attribute float geometry_id;
            attribute float boundary_id;
        #endif

        #ifdef SHOW_LOD
            uniform float show_lod;
            attribute float lod_id;
            varying float discard_;
        #endif

		#ifdef MATERIAL_THEME
			struct CityMaterial
			{
				vec3 diffuse_color;
				vec3 emissive_color;
				vec3 specular_color;
			};
			uniform CityMaterial city_materials[ MATERIAL_COUNT ];
			varying vec3 emissive_;
			attribute int MATERIAL_THEME;
		#endif

		#ifdef TEXTURE_THEME
			attribute int TEXTURE_THEME;
			attribute vec2 TEXTURE_THEME_UV;
			flat out int vTexIndex;
			varying vec2 vTexUV;
		#endif
    `;

// ---

export const city_object_diffuse_vertex : string = `
        #ifdef SHOW_SEMANTICS
            diffuse_ = surface_type > -1 ? surface_colors[surface_type] : object_colors[object_type];
        #else
			#ifdef SHOW_LAYERS
				diffuse_ = layer_type > -1 ? layer_colors[layer_type] : object_colors[object_type];
			#else
				diffuse_ = object_colors[object_type];
			#endif
        #endif

		#ifdef COLOR_ATTRIBUTE
            diffuse_ = attributevalue > -1 ? attribute_colors[attributevalue] : vec3( 0.0, 0.0, 0.0 );
        #endif

		#ifdef MATERIAL_THEME
			if ( MATERIAL_THEME > - 1 ) {
				diffuse_ = city_materials[ MATERIAL_THEME ].diffuse_color;
				emissive_ = city_materials[ MATERIAL_THEME ].emissive_color;
			}
		#endif

		#ifdef TEXTURE_THEME
			vTexIndex = TEXTURE_THEME;
			vTexUV = TEXTURE_THEME_UV;
			if ( vTexIndex > - 1 ) {
				diffuse_ = vec3( 1.0, 1.0, 1.0 );
			}
		#endif

        #ifdef SELECT_SURFACE
            diffuse_ = abs( object_id - highlighted_object_id ) < 0.5 && abs( geometry_id - highlighted_geometry_id ) < 0.5 && abs( boundary_id - highlighted_boundary_id ) < 0.5 ? highlight_color : diffuse_;
        #else
            diffuse_ = abs( object_id - highlighted_object_id ) < 0.5 ? highlight_color : diffuse_;
        #endif
    `;

// ---

export const city_object_show_lod_vertex : string = `
        #ifdef SHOW_LOD
            if ( abs ( lod_id - show_lod ) > 0.5 ) {
                discard_ = 1.0;
            }
        #endif
    `;

// ---

export interface CityMaterial {

	diffuse_color : Color
	emissive_color : Color
	specular_color : Color

}
// ---

export interface CityObjectShaderExtensions {

	derivatives ? : boolean | undefined
	clipCullDistance?: boolean | undefined
	multiDraw?: boolean | undefined

}

// ---

export interface CityObjectShader extends ShaderLibShader {

	lights ? : boolean | undefined
	extensions ? : CityObjectShaderExtensions | undefined

}

// ---

export interface CityObjectsMaterialParameters extends ShaderMaterialParameters {

	color? : number | undefined
	size? : number | undefined
	object_colors? : {[key: string] : number} | undefined
    surface_colors? : {[key: string] : number} | undefined
    layer_colors? : {[key: string] : number} | undefined

}

// ---

/**
 * A base class for a material containing shader logic to render chunks of city
 * object data. This class, should never be used on its own, but only used to
 * derive specific classes.
 */

export class CityObjectsBaseMaterial extends ShaderMaterial {

    needs_update : boolean
    object_colors_lookup : {[key: string] : number}
    surface_colors_lookup : {[key: string] : number}
    layer_colors_lookup : {[key: string] : number}
    attribute_colors_lookup : {[key: number] : number}
    is_city_objects_material : boolean

    constructor( 
		shader : CityObjectShader
	) {
		super( shader );
        this.needs_update = false;
        this.object_colors_lookup = {};
		this.object_colors = {};
        this.surface_colors_lookup = {};
		this.surface_colors = {};
		this.layer_colors_lookup = {};
		this.layer_colors = {};
        this.attribute_colors_lookup = {};
		this.attribute_colors = {};
		this.materials = [];
		this.show_semantics = false;
		this.is_city_objects_material = true;
		this.defines.OBJECT_COLOR_COUNT= 0;
		this.defines.SEMANTIC_COUNT = 0;
		this.defines.LAYER_COUNT = 0;
		this.defines.ATTRIBUTE_COUNT = 0;
		this.defines.MATERIAL_COUNT = 0;
	}

    private create_colors_array( colors : {[key: string] : number} ) : Array<Color> {
		const color_array : Array<Color> = [];
		for ( const type in colors ) {
			const color = new Color( colors[ type ] );
			color_array.push( color.convertSRGBToLinear() );
		}
		return color_array;
	}

	set attribute_colors( colors : {[key: number] : number} ) {
		if ( Object.keys( colors ).length > 0 ) {
			this.attribute_colors_lookup = colors;
			const color_array = this.create_colors_array( colors );
			this.uniforms.attribute_colors.value = color_array;
			this.defines.ATTRIBUTE_COUNT = color_array.length;
		}
	}

	get attribute_colors(): {[key: number] : number} {
		return this.attribute_colors_lookup;
	}

	get conditional_formatting () : boolean {
		return Boolean( 'COLOR_ATTRIBUTE' in this.defines );
	}

	set conditional_formatting( value : boolean ) {
		if ( Boolean( value ) !== Boolean( 'COLOR_ATTRIBUTE' in this.defines ) ) {
			this.needs_update = true;
		}
		if ( value === true ) {
			this.defines.COLOR_ATTRIBUTE = '';
		} else {
			delete this.defines.COLOR_ATTRIBUTE;
		}
	}

	set object_colors( colors : {[key: string] : number} ) {
		this.object_colors_lookup = colors;
		this.uniforms.object_colors.value = this.create_colors_array( colors );
		this.defines.OBJECT_COLOR_COUNT= Object.keys( colors ).length;
	}

	get object_colors() : {[key: string] : number} {
		return this.object_colors_lookup;
	}

	set surface_colors( colors : {[key: string] : number}) {
		this.surface_colors_lookup = colors;
		this.uniforms.surface_colors.value = this.create_colors_array( colors );
		this.defines.SEMANTIC_COUNT = Object.keys( colors ).length;
		this.needs_update = true;
	}

	get surface_colors() : {[key: string] : number} {
		return this.surface_colors_lookup;
	}

	get show_semantics () : boolean {
		return Boolean( 'SHOW_SEMANTICS' in this.defines );
	}

	set show_semantics ( value : boolean ) {
		if ( Boolean( value ) !== Boolean( 'SHOW_SEMANTICS' in this.defines ) ) {
			this.needs_update = true;
		}
		if ( value === true ) {
			this.defines.SHOW_SEMANTICS = '';
		} else {
			delete this.defines.SHOW_SEMANTICS;
		}
	}

	set layer_colors( colors : {[key: string] : number}) {
		this.layer_colors_lookup = colors;
		this.uniforms.layer_colors.value = this.create_colors_array( colors );
		this.defines.LAYER_COUNT = Object.keys( colors ).length;
		this.needs_update = true;
	}

	get layer_colors() : {[key: string] : number} {
		return this.layer_colors_lookup;
	}

	get show_layers () : boolean {
		return Boolean( 'SHOW_LAYERS' in this.defines );
	}

	set show_layers ( value : boolean ) {
		if ( Boolean( value ) !== Boolean( 'SHOW_LAYERS' in this.defines ) ) {
			this.needs_update = true;
		}
		if ( value === true ) {
			this.defines.SHOW_LAYERS = '';
		} else {
			delete this.defines.SHOW_LAYERS;
		}
	}

	get select_surface() : boolean {
		return Boolean( 'SELECT_SURFACE' in this.defines );
	}

	set select_surface( value : boolean ) {
		if ( Boolean( value ) !== Boolean( 'SELECT_SURFACE' in this.defines ) ) {
			this.needs_update = true;
		}
		if ( value === true ) {
			this.defines.SELECT_SURFACE = '';
		} else {
			delete this.defines.SELECT_SURFACE;
		}
	}

	get show_lod () : number {
		return this.uniforms.show_lod.value;
	}

	set show_lod( value : number ) {
		if ( Boolean( value > - 1 ) !== Boolean( 'SHOW_LOD' in this.defines ) ) {
			this.needs_update = true;
		}
		if ( value > - 1 ) {
			this.defines.SHOW_LOD = '';
		} else {
			delete this.defines.SHOW_LOD;
		}
		this.uniforms.show_lod.value = value;
	}

	set material_theme ( value : string ) {
		const theme_name = value.replace( /[^a-z0-9]/gi, '' );
		if ( theme_name !== this.defines.MATERIAL_THEME ) {
			this.needs_update = true;
		}
		if ( value === "undefined" || value === undefined || value == null ) {
			delete this.defines.MATERIAL_THEME;
		} else {
			this.defines.MATERIAL_THEME = `mat${theme_name}`;
		}
	}

	set texture_theme( value : string ) {
		const theme_name = value.replace( /[^a-z0-9]/gi, '' );
		if ( theme_name !== this.defines.TEXTURE_THEME ) {
			this.needs_update = true;
		}
		if ( value === "undefined" || value === undefined || value == null ) {
			delete this.defines.TEXTURE_THEME;
			delete this.defines.TEXTURE_THEME_UV;
		} else {
			this.defines.TEXTURE_THEME = `tex${theme_name}`;
			this.defines.TEXTURE_THEME_UV = `tex${theme_name}uv`;
		}
	}

	set materials( materials : Array<MaterialObject> ) {
		const city_materials : Array<CityMaterial> = [];
		for ( let i = 0; i < materials.length; i ++ ) {
			const object_material : MaterialObject = materials[ i ];
			const diffuse_color = object_material.diffuse_color != null ?
				new Color( ...object_material.diffuse_color ) :
				new Color( 1, 1, 1 );
			const emissive_color = object_material.emissive_color != null ?
				new Color( ...object_material.emissive_color ) :
				new Color( 0, 0, 0 );
			const specular_color = object_material.specular_color != null ?
				new Color( ...object_material.specular_color ) :
				new Color( 1, 1, 1 );
			const city_material : CityMaterial = {
				diffuse_color : diffuse_color.convertSRGBToLinear(),
				emissive_color : emissive_color.convertSRGBToLinear(),
				specular_color : specular_color.convertSRGBToLinear()
			};
			city_materials.push( city_material );
		}
		this.defines.MATERIAL_COUNT = city_materials.length;
		this.uniforms.city_materials.value = city_materials;
	}

	get highlight_color() : Color {
		return this.uniforms.highlight_color.value;
	}

	set highlight_color( color : string | number | Color ) {
		if ( typeof color === 'string' || color instanceof String ) {
			this.uniforms.highlight_color.value.setHex( color.replace( '#', '0x' ) );
		} else if ( typeof color === 'number' ) {
			this.uniforms.highlight_color.value.setHex( color );
		} else if ( color instanceof Color ) {
			this.uniforms.highlight_color.value = color;
		}
	}

	get highlightedObject() {

		return {

			object_index: this.uniforms.highlighted_object_id.value,
			geometry_index: this.uniforms.highlighted_geometry_id.value,
			boundary_index: this.uniforms.highlighted_boundary_id.value

		};

	}

	/**
	 * Expects an object with three properties: `object_index`, `geometry_index`,
	 * and `boundary_index`.
	 */
	set highlightedObject( objectInfo ) {

		if ( objectInfo ) {

			this.uniforms.highlighted_object_id.value = objectInfo.object_index === undefined ? - 1 : objectInfo.object_index;
			this.uniforms.highlighted_geometry_id.value = objectInfo.geometry_index === undefined ? - 1 : objectInfo.geometry_index;
			this.uniforms.highlighted_boundary_id.value = objectInfo.boundary_index === undefined ? - 1 : objectInfo.boundary_index;

		} else {

			this.uniforms.highlighted_object_id.value = - 1;
			this.uniforms.highlighted_geometry_id.value = - 1;
			this.uniforms.highlighted_boundary_id.value = - 1;

		}

	}

}

// ---
