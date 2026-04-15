//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
// SPDX-FileContributor: Stelios Vitalis (from cityjson-threejs-loader)
//
// SPDX-License-Identifier: Apache-2.0
//

// ---

import { Vector3 } from 'three';
import earcut from 'earcut';
import { TRIANGLES, GeometryData } from './GeometryData';
import { BaseParser } from './BaseParser';
import { 
	CityModel,
	CityFeature,
	CityObject,
	GeometryObject,
	CityJSONGeometryObjectType,
	CityJSONSemanticSurface,
	CityJSONGeometryObjectMaterialTheme,
	CityJSONGeometryObjectTextureTheme
} from "openbeers";

// ---

interface Point {

	x : number
	y : number
	z : number

}

// ---

interface Point2D {

	x : number
	y : number

}

// ---

/**
 * A class that parses geometries of CityJSON and creates lists of vertices and
 * other data arrays to be used in `three.js` meshes.
 * 
 * This class only loads polygonal geometries (i.e. "MultiSurface",
 * "CompositeSurface", "Solid", "MultiSolid", "CompositeSolid")
 */

export class TriangleParser extends BaseParser {

    constructor( 
        city_data : CityModel | CityFeature,
		object_ids: Array<string>,
		object_colors: {[key: string]: number},
		vertices : Array<Array<number>> | null = null
    ) {
        super( city_data, object_ids, object_colors, vertices );
        this.geometry_data = new GeometryData( TRIANGLES );
    }

    clean() : void {
		this.geometry_data = new GeometryData( TRIANGLES );
	}

    parse_geometry(
		geometry : GeometryObject,
		city_object_id : string,
		geometry_idx : number 
	) : void {
		if ( this.city_data.city_objects ) {
			const city_object : CityObject = this.city_data.city_objects[ city_object_id ];
			const id_idx = city_object ? this.get_object_idx( city_object_id ) : - 1;
			const object_type_idx : number = 
				city_object ? this.get_object_type_idx( city_object.type ) : - 1;
			const lod_idx = this.get_lod_index( geometry.lod );
			const flat_geometry : GeometryObject | null = this.flatten_geometry( geometry );
			if ( flat_geometry ) {
				this.parse_shell(
					flat_geometry,
					id_idx,
					object_type_idx,
					geometry_idx,
					lod_idx
				);
			}
		}
	}

    flatten_geometry( // flatten the geometry to a MultiSurface
		geometry : GeometryObject
	) : GeometryObject | null {
		const geometry_type : CityJSONGeometryObjectType = geometry.type;
		if ( geometry_type == "MultiSurface" || geometry_type == "CompositeSurface" ) {
			return geometry;
		}
		if ( geometry_type == "Solid" ) {
			const new_geometry : GeometryObject = Object.assign( {}, geometry );
			const boundaries = geometry.boundaries as number[][][][][];
			new_geometry.boundaries = boundaries.flat( 1 );
			if ( geometry.semantics  && new_geometry.semantics ) {
				new_geometry.semantics.values = geometry.semantics.values.flat( 1 );
			}
			if ( geometry.material && new_geometry.material ) {
				for ( const theme in geometry.material ) {
					const values = 
						geometry.material[ theme ].values as (number | null)[][][];
					new_geometry.material[ theme ].values = values.flat( 1 );
				}
			}
			if ( geometry.texture && new_geometry.texture ) {
				for ( const theme in geometry.texture ) {
					const values = 
						geometry.texture[ theme ].values as (number | null)[][][][][];
					new_geometry.texture[ theme ].values = values.flat( 1 );
				}
			}
			return new_geometry;
		}
		if ( geometry_type == "MultiSolid" || geometry_type == "CompositeSolid" ) {
			const new_geometry = Object.assign( {}, geometry );
			const boundaries = geometry.boundaries as number[][][][][][];
			new_geometry.boundaries = boundaries.flat( 2 );
			if ( geometry.semantics && new_geometry.semantics ) {
				new_geometry.semantics.values = geometry.semantics.values.flat( 2 );
			}
			if ( geometry.material && new_geometry.material) {
				for ( const theme in geometry.material ) {
					const values = 
						geometry.material[ theme ].values as (number | null)[][][][];
					new_geometry.material[ theme ].values = values.flat( 2 );
				}
			}
			if ( geometry.texture && new_geometry.texture ) {
				for ( const theme in geometry.texture ) {
					const values = 
						geometry.texture[ theme ].values as (number | null)[][][][][];
					new_geometry.texture[ theme ].values = values.flat( 2 );
				}
			}
			return new_geometry;
		}
		return null;
	}

	parse_shell( 
		geometry : GeometryObject,
		id_idx : number, 
		object_type_idx : number, 
		geometry_idx : number, 
		lod_idx : number 
	) {
		const boundaries = geometry.boundaries as number[][][];
		const semantics : (number | null)[] = 
			geometry.semantics ? geometry.semantics.values : [];
		const surfaces : CityJSONSemanticSurface[] = 
			geometry.semantics ? geometry.semantics.surfaces : [];
		const materials : {[key: string]: CityJSONGeometryObjectMaterialTheme} = 
			geometry.material ? geometry.material : {};
		const textures : {[key: string]: CityJSONGeometryObjectTextureTheme} = 
			geometry.texture ? geometry.texture : {};
		const layer_type : number = this.get_layer_type_idx( geometry.layer )
		// Contains the boundary but with the right vertex_id
		for ( let i = 0; i < boundaries.length; i ++ ) {
			let boundary : Array<number> = [];
			let holes : Array<number> = [];
			const surface_type : number = this.get_surface_type_idx(
				i,
				semantics,
				surfaces
			);
			const material_values : {[key: string]: number} = 
				this.get_surface_materials( i, materials );
			for ( let j = 0; j < boundaries[ i ].length; j ++ ) {
				if ( boundary.length > 0 ) {
					holes.push( boundary.length );
				}
				// const new_boundary = this.extractLocalIndices( geom, boundaries[ i ][ j ], vertices, json );
				// boundary.push( ...new_boundary );
				boundary.push( ...boundaries[ i ][ j ] );
			}
			if ( boundary.length == 3 ) {
				for ( let n = 0; n < 3; n ++ ) {
					this.geometry_data.add_vertex( 
						boundary[ n ],
						id_idx,
						object_type_idx,
						surface_type,
						layer_type,
						geometry_idx,
						i,
						lod_idx,
						material_values,
						this.get_texture_data(
							i,
							n,
							holes,
							textures
						) 
					);
				}
			} else if ( 
				boundary.length > 3 &&
				this.vertices != null
			) {
				let points = [];
				for ( let k = 0; k < boundary.length; k ++ ) {
					points.push( {
						x: this.vertices[ boundary[ k ] ][ 0 ],
						y: this.vertices[ boundary[ k ] ][ 1 ],
						z: this.vertices[ boundary[ k ] ][ 2 ]
					} );
				}
				const normal : Vector3 = this.get_newells_normal( points );
				//convert to 2d (for triangulation)
				let pv : number[] = []; 
				for ( let k = 0; k < points.length; k ++ ) {
					const point_2d : Point2D = this.to_2d( points[ k ], normal );
					pv.push( point_2d.x );
					pv.push( point_2d.y );
				}
				//triangulate
				const tr = earcut( pv, holes, 2 );
				// create faces based on triangulation
				for ( let k = 0; k < tr.length; k += 3 ) {
					for ( let n = 0; n < 3; n ++ ) {
						const vertex = boundary[ tr[ k + n ] ];
						this.geometry_data.add_vertex(
							vertex,
							id_idx,
							object_type_idx,
							surface_type,
							layer_type,
							geometry_idx,
							i,
							lod_idx,
							material_values,
							this.get_texture_data(
								i,
								tr[ k + n ],
								holes,
								textures
							)
						);
					}
				}
			}
		}
	}

	get_newells_normal( points : Array<Point> ) : Vector3 {
		let n = [ 0.0, 0.0, 0.0 ];
		for ( let i = 0; i < points.length; i ++ ) {
			let nex = i + 1;
			if ( nex == points.length ) {
				nex = 0;
			}
			n[ 0 ] = n[ 0 ] + 
				( ( points[ i ].y - points[ nex ].y ) * 
				( points[ i ].z + points[ nex ].z ) );
			n[ 1 ] = n[ 1 ] + 
				( ( points[ i ].z - points[ nex ].z ) * 
				( points[ i ].x + points[ nex ].x ) );
			n[ 2 ] = n[ 2 ] + 
				( ( points[ i ].x - points[ nex ].x ) * 
				( points[ i ].y + points[ nex ].y ) );
		}
		let b = new Vector3( n[ 0 ], n[ 1 ], n[ 2 ] );
		return ( b.normalize() );
	}

	to_2d( point : Point, normal : Vector3 ): Point2D {
		const point_vector : Vector3 = 
			new Vector3( point.x, point.y, point.z );
		let x3 = new Vector3( 1.1, 1.1, 1.1 );
		if ( x3.distanceTo( normal ) < 0.01 ) {
			x3.add( new Vector3( 1.0, 2.0, 3.0 ) );
		}
		let tmp = x3.dot( normal );
		let tmp2 = normal.clone();
		tmp2.multiplyScalar( tmp );
		x3.sub( tmp2 );
		x3.normalize();
		let y3 = normal.clone();
		y3.cross( x3 );
		let x = point_vector.dot( x3 );
		let y = point_vector.dot( y3 );
		let point_2d : Point2D = { x: x, y: y };
		return point_2d;
	}

}

// ---
