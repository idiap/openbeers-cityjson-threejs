//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
// SPDX-FileContributor: Stelios Vitalis (from cityjson-threejs-loader)
//
// SPDX-License-Identifier: Apache-2.0
//

// ---

export const NONE = -1;
export const POINTS = 0;
export const LINES = 1;
export const TRIANGLES = 2;

// ---

export interface TextureData {

	 index : number 
	 uvs : Array<number>

}

// ---

export interface TextureArray {

	 index : number[]
	 uvs : number[][]

}

// --- 

export interface GeometryDataDump {
	
	geometry_type: number
	object_ids: Array<number>
	object_types: Array<number>
	semantic_surfaces: Array<number>
	layer_types: Array<number>
	geometry_ids: Array<number>
	boundary_ids: Array<number>
	lod_ids: Array<number>
	materials: {[key: string]: Array<number>}
	textures: {[key: string]: TextureArray}
		
}

// ---

export class GeometryData {

    geometry_type : number
    vertex_ids : Array<number>
    object_ids : Array<number>
    object_types : Array<number>
    semantic_surfaces : Array<number>
	layer_types : Array<number>
    geometry_ids : Array<number>
    boundary_ids : Array<number>
    lod_ids : Array<number>
	materials : {[key: string]: Array<number>}
	textures : {[key: string]: TextureArray}

	constructor(geometry_type: number) {
		this.geometry_type = geometry_type;
		this.vertex_ids = [];
		this.object_ids = [];
		this.object_types = [];
		this.semantic_surfaces = [];
		this.layer_types = [];
		this.geometry_ids = [];
		this.boundary_ids = [];
		this.lod_ids = [];
		this.materials = {};
		this.textures = {};

	}

    append_material ( theme : string, value : number ) : void {
		if ( ! ( theme in this.materials ) ) {
			this.materials[ theme ] = [];
		}
		const theme_array = this.materials[ theme ];
		for ( let i = theme_array.length; i < this.count() - 1; i ++ ) {
			theme_array.push( - 1 );
		}
		this.materials[ theme ].push( value );
	}


	complete_materials () : void {
		for ( const theme in this.materials ) {
			const theme_array = this.materials[ theme ];
			for ( let i = theme_array.length; i < this.count(); i ++ ) {
				theme_array.push( - 1 );
			}
		}
	}

	append_texture( theme : string, texture_data: TextureData ) : void {
		if ( ! ( theme in this.textures ) ) {
			const texture_array : TextureArray = {
				index: [],
				uvs: []
			};
			this.textures[ theme ] = texture_array;
		}
		const theme_array : TextureArray = this.textures[ theme ];
		for ( let i = theme_array.index.length; i < this.count() - 1; i ++ ) {
			theme_array.index.push( - 1 );
			theme_array.uvs.push( [ 0, 0 ] );
		}
		theme_array.index.push( texture_data.index );
		theme_array.uvs.push( texture_data.uvs );
	}

	complete_textures() {
		for ( const theme in this.textures ) {
			const theme_array : TextureArray = this.textures[ theme ];
			for ( let i = theme_array.index.length; i < this.count(); i ++ ) {
				theme_array.index.push( - 1 );
				theme_array.uvs.push( [ 0, 0 ] );
			}
		}
	}

    add_vertex(
        vertex_id: number,
        object_id: number,
        object_type: number,
        surface_type: number,
		layer_type: number,
        geometry_idx: number,
        boundary_idx: number,
        lod_idx: number,
        materials : {[key: string]: number} | null = null,
        textures : {[key: string]: TextureData} | null = null
    ) : void {
		this.vertex_ids.push( vertex_id );
		this.object_ids.push( object_id );
		this.object_types.push( object_type );
		this.semantic_surfaces.push( surface_type );
		this.layer_types.push( layer_type );
		this.geometry_ids.push( geometry_idx );
		this.boundary_ids.push( boundary_idx );
		this.lod_ids.push( lod_idx );
		if ( materials ) {
			const context = this;
			Object.entries( materials ).forEach( entry => {
				const [ theme, value ] = entry;
				context.append_material( theme, value );
			} );
		}
		if ( textures ) {
			const context = this;
			Object.entries( textures ).forEach( entry => {
				const [ theme, texture_data ] = entry;
				context.append_texture( theme, texture_data );
			} );
		}
	}

    count () : number {
		return this.vertex_ids.length;
	}

    /**
     * Returns the dereferenced vertices, meaning that the actual coordinates as
     * derived from looking up `vertexList` based on `vertex_ids` are returned.
     */

    get_vertices ( vertex_list: Array<number>[] ) : Array<number> {
		let vertices = [];
		for ( const vertex_index of this.vertex_ids ) {
			const vertex = vertex_list[ vertex_index ];
			vertices.push( ...vertex );
		}
		return vertices;
	}

    /**
     * Returns the data in an object format (for serialization).
     */

    dump () : GeometryDataDump {
		this.complete_materials();
		this.complete_textures();
		return {
			geometry_type: this.geometry_type,
			object_ids: this.object_ids,
			object_types: this.object_types,
			semantic_surfaces: this.semantic_surfaces,
			layer_types: this.layer_types,
			geometry_ids: this.geometry_ids,
			boundary_ids: this.boundary_ids,
			lod_ids: this.lod_ids,
			materials: this.materials,
			textures: this.textures
		};
	}

    /**
     * Sets all object_ids to a specific value.
     */

    set_object_id( object_id : number ) : void {
		for ( let i = 0; i < this.object_ids.length; i ++ ) {
			this.object_ids[ i ] = object_id;
		}
	}

    // Sets all object_types to a specific value.

    set_object_type( object_type : number ) : void {
		for ( let i = 0; i < this.object_types.length; i ++ ) {
			this.object_types[ i ] = object_type;
		}
	}

     /**
     * Sets all geometry indexes to a specific value.
     */

    set_geometry_idx( geometry_idx : number ) : void {
		for ( let i = 0; i < this.geometry_ids.length; i ++ ) {
			this.geometry_ids[ i ] = geometry_idx;
		}
	}

    merge ( other_geom_data : GeometryData ) : void {
		if ( other_geom_data.geometry_type != this.geometry_type ) {
			console.warn( "Merging different types of geometry data!" );
		}
		this.vertex_ids.concat( other_geom_data.vertex_ids );
		this.object_ids.concat( other_geom_data.object_ids );
		this.object_types.concat( other_geom_data.object_types );
		this.semantic_surfaces.concat( other_geom_data.semantic_surfaces );
		this.layer_types.concat( other_geom_data.layer_types );
		this.geometry_ids.concat( other_geom_data.geometry_ids );
		this.boundary_ids.concat( other_geom_data.boundary_ids );
		this.lod_ids.concat( other_geom_data.lod_ids );
	}

}

// ---
