//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
// SPDX-FileContributor: Stelios Vitalis (from cityjson-threejs-loader)
//
// SPDX-License-Identifier: Apache-2.0
//

// ---

import { GeometryDataDump } from "../parsers/GeometryData";
import { 
	BufferAttribute,
	InstancedBufferGeometry,
	Int32BufferAttribute,
	Matrix4,
	InstancedBufferAttribute,
	Intersection
} from 'three';
import { IntersectionInfo } from './IntersectionInfo'
import { CityObjectBase } from './CityObjectBase'
import { CityDataEvaluator } from "../openbeers/CityDataEvaluator";
import { TextureManager } from "../materials/TextureManager";
import { CityObjectsMeshMaterial } from "../materials/CityObjectsMeshMaterial";
import type { TextureLookup } from './CityObjectsMesh'

// ---

export interface ObjectInstance {
	matrices: Matrix4[],
	object_ids: number[],
	object_type: number[],
	geometry_ids: number[]
}

// ---

/**
 * This class is designed to wrap some logic for the creation of a mesh that 
 * contains polygonal CityJSON geometries derived from `GeometryInstance`,
 * 
 * It also contains functions to retrieve info of the city model based on an
 * intersection.
 */

export class CityObjectsInstancedMesh extends CityObjectBase {

	is_city_object_mesh: true;
    supports_conditional_formatting: true;
    supports_materials: true;
	mesh_material: CityObjectsMeshMaterial

    constructor ( 
        vertex_buffer: ArrayBuffer, 
        geometry_data_dump: GeometryDataDump, 
        instance_data: ObjectInstance, 
        matrix: Matrix4 | null,
        material: CityObjectsMeshMaterial 
    ) {
        const geometry = new InstancedBufferGeometry();
        const vertex_array = new Float32Array( vertex_buffer );
        geometry.setAttribute( 'position', new BufferAttribute( vertex_array, 3 ) );
        const object_ids_array = new Uint16Array( geometry_data_dump.object_ids );
        geometry.setAttribute( 'object_id', new InstancedBufferAttribute( object_ids_array, 1 ) );
        const object_type_array = new Int32Array( geometry_data_dump.object_types );
        geometry.setAttribute( 'object_type', new InstancedBufferAttribute( object_type_array, 1 ) );
        const surface_type_array = new Int32Array( geometry_data_dump.semantic_surfaces );
        geometry.setAttribute( 'surface_type', new Int32BufferAttribute( surface_type_array, 1 ) );
		const layer_type_array = new Int32Array( geometry_data_dump.layer_types );
        geometry.setAttribute( 'layer_type', new Int32BufferAttribute( layer_type_array, 1 ) );
        const geometry_ids_array = new Float32Array( geometry_data_dump.geometry_ids );
        geometry.setAttribute( 'geometry_id', new InstancedBufferAttribute( geometry_ids_array, 1 ) );
        const lod_ids_array = new Int8Array( geometry_data_dump.lod_ids );
        geometry.setAttribute( 'lod_id', new BufferAttribute( lod_ids_array, 1 ) );
        const boundary_ids_array = new Float32Array( geometry_data_dump.boundary_ids );
        geometry.setAttribute( 'boundary_id', new BufferAttribute( boundary_ids_array, 1 ) );
		for ( const material_theme in geometry_data_dump.materials ) {
			const theme_name = material_theme.replace( /[^a-z0-9]/gi, '' );
			const material_array = new Uint8Array( geometry_data_dump.materials[ material_theme ] );
			geometry.setAttribute( `mat${theme_name}`, new Int32BufferAttribute( material_array, 1 ) );
		}
        geometry.attributes.position.needsUpdate = true;
        if ( matrix ) {
            geometry.applyMatrix4( matrix );
        }
        geometry.computeVertexNormals();
		// TODO fix instance
		// @ts-ignore
        super( geometry, material, geometry_data_dump.matrices.length );
        for ( let j = 0; j < instance_data.matrices.length; j ++ ) {
			// TODO fix instance
			// @ts-ignore
            this.setMatrixAt( j, instance_data.matrices[ j ] );
        }
        this.is_city_object_mesh = true;
        this.supports_conditional_formatting = true;
        this.supports_materials = true;
		this.mesh_material = material;
    }

	get_intersection_vertex( intersection: Intersection ) : number | null {
		if ( intersection.face ) {
			return intersection.face.a;
		}
		return null;
	}

    resolve_intersection_info(
		intersection: Intersection,
		city_objects_ids: Array<string>
	) : IntersectionInfo | null {
		const vertex_idx : number | null = this.get_intersection_vertex( intersection );
		const instance_id : number | undefined = intersection.instanceId;
		if ( vertex_idx != null && instance_id !== undefined ) {
			const idx = this.geometry.getAttribute( 'object_id' ).getX( instance_id );
			const intersection_info : IntersectionInfo = {
				vertex_index : vertex_idx,
				object_index : idx,
				city_object_id : city_objects_ids[ idx ],
				geometry_index : this.geometry.getAttribute( 'geometry_id' ).getX( instance_id ),
				boundary_index : this.geometry.getAttribute( 'boundary_id' ).getX( vertex_idx ),
				object_type_index : this.geometry.getAttribute( 'object_type' ).getX( instance_id ),
				surface_type_index : this.geometry.getAttribute( 'surface_type' ).getX( vertex_idx ),
				lod_index : this.geometry.getAttribute( 'lod_id' ).getX( vertex_idx ),
			}
			return intersection_info;
		}
		return null;
	}

	add_data_attribute( evaluator : CityDataEvaluator ) {
		const data_buffer_attribute : Int32BufferAttribute | null = evaluator.get_data_buffer_attribute(
			this.geometry.attributes.object_id as BufferAttribute
		);
		if ( data_buffer_attribute != null ) {
			this.geometry.setAttribute( 'attributevalue', data_buffer_attribute);
		}
	}

	set_texture_theme(
		theme : string,
		texture_manager : TextureManager
	) {
		if ( theme === "undefined" ) {
			this.unset_textures();
			return;
		}
		const theme_name = theme.replace( /[^a-z0-9]/gi, '' );
		const attribute_name = `tex${theme_name}`;
		if ( attribute_name in this.geometry.attributes ) {
			const texture_attribute = this.geometry.attributes[ attribute_name ] as Int32BufferAttribute;
			const texture_ids = texture_attribute.array;
			// Create a lookup of textures
			// TODO fix typing error
			// @ts-ignore
			const texture_lookup : TextureLookup = texture_ids.reduce( 
				function ( 
					p : TextureLookup, 
					c : number, 
					i : number,
					a: any
				) : TextureLookup {
					if ( p.last !== c ) {
						p.values.push( c );
						p.indices.push( i );
						p.last = c;
					}
					return p;
				}, 
				{ 
					last: - 1, 
					values: [], 
					indices: [] 
				} as TextureLookup
			);
			const base_material = Array.isArray( this.material ) ? 
				this.material[ this.material.length - 1 ] : 
				this.material;
			
			const materials : Array<CityObjectsMeshMaterial> = 
			// TODO check this
			// @ts-ignore
				texture_manager.get_materials( base_material );
			for ( const mat of materials ) {
				if ( mat !== base_material ) {
					mat.texture_theme = theme;
				}
			}
			// TODO: We need to add the last element here
			for ( let i = 0; i < texture_lookup.indices.length - 1; i ++ ) {
				this.geometry.addGroup( 
					texture_lookup.indices[ i ], 
					texture_lookup.indices[ i + 1 ] - texture_lookup.indices[ i ], 
					texture_lookup.values[ i ] > - 1 ? 
						texture_lookup.values[ i ] : 
						materials.length - 1 
				);
			}
			const i = texture_lookup.indices.length - 1;
			this.geometry.addGroup(
				texture_lookup.indices[ i ],
				this.geometry.attributes.type.array.length - texture_lookup.indices[ i ], 
				texture_lookup.values[ i ] > - 1 ? 
					texture_lookup.values[ i ] : 
					materials.length - 1
				);
			// TODO
			//this.material = materials;
		}
	}

	unset_textures () : void {
		if ( Array.isArray( this.material ) ) {
			this.material = this.material[ this.material.length - 1 ];
		}
		// TODO check this
		// @ts-ignore
		this.material.texture_theme = "undefined";
	}

}

// ---
