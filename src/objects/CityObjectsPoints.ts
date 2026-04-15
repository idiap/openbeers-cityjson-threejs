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
	Matrix4, 
	BufferAttribute,
	BufferGeometry,
	Int32BufferAttribute,
	Intersection
} from 'three';
import { IntersectionInfo } from './IntersectionInfo'
import { CityObjectBase } from './CityObjectBase'
import { CityObjectsPointsMaterial } from "../materials/CityObjectsPointsMaterial";

// ---

/**
 * This class is designed to wrap some logic for the creation of a point object
 * that contains `MultiPoints` CityJSON geometries, from `GeometryData`
 * extracted using a `PointParser`.
 * 
 * It also contains functions to retrieve info of the city model based on an
 * intersection.
 */

export class CityObjectsPoints extends CityObjectBase {

    is_city_object_points: true;

    /**
     * Creates a CityObjectMesh from `GeometryData`
     * 
     * @param vertex_buffer The list of vertices for the mesh
     * @param geometry_data_dump The geometry data with all other information (object_ids etc.)
     * @param matrix A matrix to transform the mesh
     * @param material A material (preferably a `CityObjectsMeshMaterial`)
     */
    constructor ( 
        vertex_buffer: ArrayBuffer, 
        geometry_data_dump: GeometryDataDump, 
        matrix: Matrix4 | null,
        material: CityObjectsPointsMaterial 
    ) {
		const geometry = new BufferGeometry();
		const vertex_array = new Float32Array( vertex_buffer );
		geometry.setAttribute( 'position', new BufferAttribute( vertex_array, 3 ) );
		const object_ids_array = new Uint16Array( geometry_data_dump.object_ids );
		geometry.setAttribute( 'object_id', new BufferAttribute( object_ids_array, 1 ) );
		const object_type_array = new Int32Array( geometry_data_dump.object_types );
		geometry.setAttribute( 'object_type', new Int32BufferAttribute( object_type_array, 1 ) );
		const surface_type_array = new Int32Array( geometry_data_dump.semantic_surfaces );
		geometry.setAttribute( 'surface_type', new Int32BufferAttribute( surface_type_array, 1 ) );
		const layer_type_array = new Int32Array( geometry_data_dump.layer_types );
		geometry.setAttribute( 'layer_type', new Int32BufferAttribute( layer_type_array, 1 ) );
		const geometry_ds_array = new Float32Array( geometry_data_dump.geometry_ids );
		geometry.setAttribute( 'geometry_id', new BufferAttribute( geometry_ds_array, 1 ) );
		const lod_ids_array = new Int8Array( geometry_data_dump.lod_ids );
		geometry.setAttribute( 'lod_id', new BufferAttribute( lod_ids_array, 1 ) );
		const boundary_ids_array = new Float32Array( geometry_data_dump.boundary_ids );
		geometry.setAttribute( 'boundary_id', new BufferAttribute( boundary_ids_array, 1 ) );
		geometry.attributes.position.needsUpdate = true;
		if ( matrix ) {
			geometry.applyMatrix4( matrix );
		}
		geometry.computeVertexNormals();
		super( geometry, material );
		this.is_city_object_points = true;
	}

	get_intersection_vertex( intersection: Intersection ) : number | null {
		if ( intersection.index !== undefined ) {
			return intersection.index;
		}
		return null;
	}

    resolve_intersection_info(
		intersection: Intersection,
		city_objects_ids: Array<string>
	) : IntersectionInfo | null {
		const vertex_idx : number | null = this.get_intersection_vertex( intersection );
		if ( vertex_idx != null ) {
			const idx = this.geometry.getAttribute( 'object_id' ).getX( vertex_idx );
			const intersection_info : IntersectionInfo = {
				vertex_index : vertex_idx,
				object_index : idx,
				city_object_id : city_objects_ids[ idx ],
				geometry_index : this.geometry.getAttribute( 'geometry_id' ).getX( vertex_idx ),
				boundary_index : this.geometry.getAttribute( 'boundary_id' ).getX( vertex_idx ),
				object_type_index : this.geometry.getAttribute( 'object_type' ).getX( vertex_idx ),
				surface_type_index : this.geometry.getAttribute( 'surface_type' ).getX( vertex_idx ),
				lod_index : this.geometry.getAttribute( 'lod_id' ).getX( vertex_idx ),
			}
			return intersection_info;
		}
		return null;
	}

}

// ---
