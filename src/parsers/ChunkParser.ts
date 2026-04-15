//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
// SPDX-FileContributor: Stelios Vitalis (from cityjson-threejs-loader)
//
// SPDX-License-Identifier: Apache-2.0
//

// ---

import { Matrix4 } from 'three';
import { BaseParser } from './BaseParser';
import type { GeometryDataDump } from './GeometryData';
import { LineParser } from './LineParser';
import { PointParser } from './PointParser';
import { TriangleParser } from './TriangleParser';
import { 
	CityModel, 
	CityFeature, 
	CityObject,
	CityJSONGeometryLevelOfDetail
 } from 'openbeers';

// ---

export class ChunkParser {

    matrix : Matrix4 | null
    chunk_size : number
	lods: Array<CityJSONGeometryLevelOfDetail>
	object_colors : {[key: string]: number}
    surface_colors : {[key: string]: number}
	layer_colors : {[key: string]: number}
	on_chunk_load : ( 
		vertices: Array<number>,
		geometry_data_dump : GeometryDataDump,
		lods: Array<CityJSONGeometryLevelOfDetail>,
		object_colors : {[key: string]: number},
    	surface_colors : {[key: string]: number},
		layer_colors : {[key: string]: number}
	) => void
	on_complete : () => void

    constructor() {
		this.matrix = null;
		this.chunk_size = 2000;
		this.lods = [];
		this.object_colors = {};
		this.surface_colors = {};
		this.layer_colors = {};
		this.on_chunk_load = ( 
			vertices: Array<number>,
			geometry_data_dump : GeometryDataDump,
			lods: Array<CityJSONGeometryLevelOfDetail>,
			object_colors : {[key: string]: number},
			surface_colors : {[key: string]: number},
			layer_colors : {[key: string]: number}
		) => {};
		this.on_complete = () => {};
	}

    parse ( city_data : CityModel | CityFeature ) : void {
		let i : number = 0;
		if ( city_data.city_objects ) {
			const city_objects_ids : Array<string> = Object.keys( city_data.city_objects );
			const geometry_parsers = [
				new TriangleParser( city_data, city_objects_ids, this.object_colors ),
				new LineParser( city_data, city_objects_ids, this.object_colors ),
				new PointParser( city_data, city_objects_ids, this.object_colors )
			];
			for ( const city_object_id in city_data.city_objects ) {
				const city_object : CityObject = city_data.city_objects[ city_object_id ];
				if ( city_object.geometry && city_object.geometry.length > 0 ) {
					for ( let geom_i = 0; geom_i < city_object.geometry.length; geom_i ++ ) {
						for ( const geometry_parser of geometry_parsers ) {
							geometry_parser.lods = this.lods;
							geometry_parser.parse_geometry(
								city_object.geometry[ geom_i ],
								city_object_id,
								geom_i
							);
							this.lods = geometry_parser.lods;
						}
					}
				}
				if ( i ++ > this.chunk_size ) {
					for ( const geometry_parser of geometry_parsers ) {
						this.return_objects( geometry_parser, city_data );
						geometry_parser.clean();
					}
					i = 0;
				}
			}
			for ( const geometry_parser of geometry_parsers ) {
				// TODO: fix the "finished" flag here - probably better be a
				// different callback
				this.return_objects( geometry_parser, city_data );
				geometry_parser.clean();
			}
			// TODO: this needs some fix - probably a common configuration class
			// shared between the parsers
			this.object_colors = geometry_parsers[ 0 ].object_colors;
			this.surface_colors = geometry_parsers[ 0 ].surface_colors;
			this.layer_colors = geometry_parsers[ 0 ].layer_colors;
			if ( this.on_complete ) {
				this.on_complete();
			}
		}
	}

	return_objects(
		parser : BaseParser,
		city_data : CityModel | CityFeature
	) : void {
		if ( 
			parser.geometry_data.count() > 0 &&
			city_data.vertices
		) {
			this.on_chunk_load( 
				parser.geometry_data.get_vertices( city_data.vertices ),
				parser.geometry_data.dump(),
				parser.lods,
				parser.object_colors,
				parser.surface_colors,
				parser.layer_colors
			);
		}
	}

}

// ---
