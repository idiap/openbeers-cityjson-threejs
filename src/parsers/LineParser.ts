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
import { LINES, GeometryData } from './GeometryData';
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
 * This class only loads "MultiLineString" geometries and creates line segments
 * (i.e. vertices are pairs of the line segments start and end node).
 */

export class LineParser extends BaseParser {

    constructor( 
        city_data : CityModel | CityFeature,
		object_ids: Array<string>,
		object_colors: {[key: string]: number},
		vertices : Array<Array<number>> | null = null
    ) {
		super( city_data, object_ids, object_colors, vertices);
		this.geometry_data = new GeometryData( LINES );
	}

    clean() : void {
		this.geometry_data = new GeometryData( LINES );
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
			geometry.type == "MultiLineString"
		) {
			const city_object : CityObject = this.city_data.city_objects[ city_object_id ];
			const id_idx = this.get_object_idx( city_object_id );
			const object_type_idx = this.get_object_type_idx( city_object.type );
			const layer_type : number = this.get_layer_type_idx( geometry.layer )
			const lod_idx = this.get_lod_index( city_object.geometry[ geometry_idx ].lod );
			const line_strings = geometry.boundaries as number[][];
			for ( let i = 0; i < line_strings.length; i ++ ) {
				if ( line_strings[ i ].length > 1 ) {
					const semantics : (number | null)[] = 
						geometry.semantics ? geometry.semantics.values : [];
					const surface_type : number = 
						this.get_surface_type_idx( i, semantics, semantic_surfaces );
					const line_string = line_strings[ i ];
					// Contains the boundary but with the right vertex_id
					for ( let j = 0; j < line_strings[ i ].length - 1; j ++ ) {
						this.geometry_data.add_vertex( line_string[ j ],
							id_idx,
							object_type_idx,
							surface_type,
							layer_type,
							geometry_idx,
							i,
							lod_idx
						);
						this.geometry_data.add_vertex( line_string[ j + 1 ],
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
	}
}

// ---
