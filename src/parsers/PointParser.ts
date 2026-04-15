//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
// SPDX-FileContributor: Stelios Vitalis (from cityjson-threejs-loader)
//
// SPDX-License-Identifier: Apache-2.0
//

// ---


import { BaseParser } from "./BaseParser";
import { POINTS, GeometryData } from './GeometryData';
import { 
	CityModel,
	CityFeature,
	CityObject,
	GeometryObject,
	CityJSONSemanticSurface
} from "openbeers";

// ---

/**
 * A class that parses geometries of CityJSON and creates lists of vertices and
 * other data arrays to be used in `three.js` lines.
 * 
 * This class only loads "MultiPoints" geometries.
 */

export class PointParser extends BaseParser {

    constructor( 
        city_data : CityModel | CityFeature,
		object_ids: Array<string>,
		object_colors: {[key: string]: number},
		vertices : Array<Array<number>> | null = null
    ) {
		super( city_data, object_ids, object_colors, vertices );
		this.geometry_data = new GeometryData( POINTS );
	}

    clean() : void {
		this.geometry_data = new GeometryData( POINTS );
	}

    parse_geometry(
		geometry : GeometryObject,
		city_object_id : string,
		geometry_idx : number 
	) : void {
		const semantic_surfaces : CityJSONSemanticSurface[] = 
			geometry.semantics ? geometry.semantics.surfaces : [];
		if ( 
			this.city_data.city_objects &&
			geometry.type == "MultiPoint"
		) {
			const city_object : CityObject = this.city_data.city_objects[ city_object_id ];
			const id_idx = this.get_object_idx( city_object_id );
			const object_type_idx = this.get_object_type_idx( city_object.type );
			const layer_type : number = this.get_layer_type_idx( geometry.layer )
			const lod_idx = this.get_lod_index( city_object.geometry[ geometry_idx ].lod );
			const points = geometry.boundaries as number[];
			for ( let i = 0; i < points.length; i ++ ) {
				const semantics : (number | null)[] = 
					geometry.semantics ? geometry.semantics.values : [];
				const surface_type : number = this.get_surface_type_idx(
					i,
					semantics,
					semantic_surfaces
				);
				this.geometry_data.add_vertex( points[ i ],
					id_idx,
					object_type_idx,
					surface_type,
					layer_type,
					geometry_idx,
					i,
					lod_idx
				);
			}
		}
	}
}

// ---
