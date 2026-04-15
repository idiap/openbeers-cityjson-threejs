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
	GeometryData,
	TextureData,
	NONE
} from "./GeometryData";
import { 
	default_semantics_colors,
	default_layers_colors
} from '../materials/colors'
import { 
	CityModel, 
	CityFeature, 
	AppearanceObject, 
	GeometryObject,
	CityJSONCityObjectType,
	CityJSONSemanticSurface,
	CityJSONGeometryObjectMaterialTheme,
	CityJSONGeometryLevelOfDetail,
	CityJSONGeometryObjectTextureTheme,
	Layer
} from "openbeers";

// ---

export class BaseParser {

	city_data : CityModel | CityFeature
    geometry_data : GeometryData
	vertices : Array<Array<number>> | null
	object_ids : Array<string>
	object_colors : {[key: string]: number}
	surface_colors : {[key: string]: number}
	layer_colors:  {[key: string]: number}
	lods : Array<CityJSONGeometryLevelOfDetail>

    constructor(
		city_data : CityModel | CityFeature,
		object_ids: Array<string>,
		object_colors: {[key: string]: number},
		vertices : Array<Array<number>> | null = null
	) {
        this.city_data = city_data;
		this.geometry_data = new GeometryData( NONE );
		if ( vertices ) {
			this.vertices = vertices;
		} else if ( this.city_data.vertices ) {
			this.vertices = this.city_data.vertices;
		} else {
			this.vertices = null;
		}
        this.object_ids = object_ids;
        this.object_colors = object_colors;
        this.surface_colors = default_semantics_colors;
		this.layer_colors = default_layers_colors;
        this.lods = [];
    }

    clean () : void { }

    parse_geometry(
		geometry : GeometryObject,
		city_object_id : string,
		geometry_idx : number 
	) : void {}

	get_object_idx( city_object_id : string ) {
		return this.object_ids.indexOf( city_object_id );
	}

	get_object_type_idx(
		city_object_type : CityJSONCityObjectType
	) : number {
		const city_object_type_str : string = String ( city_object_type );
		return Object.keys( this.object_colors ).indexOf( city_object_type_str );
	}

	get_surface_type_idx(
		idx : number,
		semantics : Array<number | null>,
		surfaces : Array<CityJSONSemanticSurface>
	) {
		let surface_type = - 1;
		if ( semantics.length > 0 ) {
			const semantic : number | null = semantics[ idx ]
			if ( semantic != null ) {
				const surface = surfaces[ semantic ];
				const surface_type_str : string = String( surface.type );
				if ( surface ) {
					surface_type = Object.keys(
						this.surface_colors
					).indexOf( surface_type_str );
				}
			}
		}
		return surface_type;
	}

	get_layer_type_idx(
		layer_name : string | null | undefined
	) {
		let layer_type = - 1;
		if ( 
			typeof layer_name === "string" &&
			layer_name in this.layer_colors 
		) {
			layer_type = Object.keys(
				this.layer_colors
			).indexOf( layer_name );
		}
		return layer_type;
	}

	get_surface_materials(
		idx : number,
		materials : {[key: string]: CityJSONGeometryObjectMaterialTheme}
	) : {[key: string]: number} {
		const pairs = Object.entries( materials ).map( mat => {
			const [ theme_name, theme ] = mat;
			theme_name as string;
			theme as CityJSONGeometryObjectMaterialTheme;
			const theme_values = theme.values as (number | null)[] | undefined;
			if ( 
				theme_values != null &&
				theme_values !== undefined &&
				idx < theme_values.length &&
				theme_values[ idx ] != null
			 ) {
				const value : number = theme_values[ idx ];
				return [ theme_name, value ];
			} else {
				return [ theme_name, - 1 ];
			}
		} );
		return Object.fromEntries( pairs );
	}

	get_texture_data( 
		surface_idx : number,
		vertex_idx : number,
		holes : Array<number>,
		textures : {[key: string]: CityJSONGeometryObjectTextureTheme} 
	) : {[key: string]: TextureData} {
		const appearance : AppearanceObject | null | undefined = this.city_data.appearance;
		if ( appearance && appearance.vertices_texture ) {
			const vertices_texture : number[][] = appearance.vertices_texture;
			const pairs = Object.entries( textures ).map( tex => {
				const [ theme_name, theme ] = tex;
				const theme_values = theme.values as (number | null)[][][];
				if ( theme_values ) {
					const active_holes = holes.filter( v => v <= vertex_idx );
					const ring_id = active_holes.length;
					const v_id = ring_id ?
						vertex_idx - active_holes[ active_holes.length - 1 ] :
						vertex_idx;
					// TODO: check
					const data : (number | null)[][] = theme_values[ surface_idx ];
					if ( data[ 0 ][ 0 ] !== null ) {
						const data_point : number | null = data[ ring_id ][ v_id + 1 ];
						if ( data_point != null ) {
							const uvs : number[] = vertices_texture[ data_point ];
							const texture_data : TextureData = { index: data[ 0 ][ 0 ], uvs: uvs };
							return [ theme_name, texture_data ];
						}
					}
				}
				const texture_data : TextureData = { index: - 1, uvs: [ 0, 0 ] };
				return [ theme_name, texture_data ];
			} );
			return Object.fromEntries( pairs );
		}
		return {};
	}

	get_lod_index(
		lod : CityJSONGeometryLevelOfDetail | undefined
	) : number {
		if ( lod === undefined ) {
			return - 1;
		}
		const lod_idx = this.lods.indexOf( lod );
		if ( lod_idx < 0 ) {
			const new_idx = this.lods.length;
			this.lods.push( lod );
			return new_idx;
		}
		return lod_idx;
	}

}

// ---
