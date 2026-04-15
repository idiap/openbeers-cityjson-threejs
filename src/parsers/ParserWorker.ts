//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
// SPDX-FileContributor: Stelios Vitalis (from cityjson-threejs-loader)
//
// SPDX-License-Identifier: Apache-2.0
//

// ---

import 'regenerator-runtime/runtime';
import { ChunkParser } from './ChunkParser';
import { GeometryDataDump } from './GeometryData';
import { CityFeature, CityJSONGeometryLevelOfDetail, CityModel } from 'openbeers';

// ---

export interface ParserConfig {
			
	chunk_size : number
	object_colors : {[key: string]: number}
	lods : Array<CityJSONGeometryLevelOfDetail>
} 

// ---

export interface ParserMessage {

	type : string
	vertex_buffer : ArrayBuffer
	geometry_data_dump : GeometryDataDump
	lods : Array<CityJSONGeometryLevelOfDetail>
	object_colors : {[key: string]: number}
	surface_colors : {[key: string]: number}
	layer_colors : {[key: string]: number}

}

// ---

onmessage = function ( e : MessageEvent<Array<CityModel | CityFeature | ParserConfig>> ) {
	const parser = new ChunkParser();
	const props = e.data[ 1 ] as ParserConfig;
	parser.chunk_size = props.chunk_size;
	parser.object_colors = props.object_colors;
	parser.lods = props.lods;
	parser.on_chunk_load = ( 
		vertices : Array<number>,
		geometry_data_dump : GeometryDataDump,
		lods : Array<CityJSONGeometryLevelOfDetail>,
		object_colors : {[key: string]: number},
		surface_colors : {[key: string]: number},
		layer_colors : {[key: string]: number}
	 ) => {
		const vertex_array = new Float32Array( vertices );
		const vertex_buffer = vertex_array.buffer;
		const parser_message : ParserMessage= {
			type: "chunk_loaded",
			vertex_buffer: vertex_buffer,
			geometry_data_dump: geometry_data_dump,
			lods : lods,
			object_colors : object_colors,
			surface_colors : surface_colors,
			layer_colors : layer_colors
		};
		postMessage( parser_message ); //, [ vertex_buffer ] );
	};
	parser.on_complete = () => {
		this.postMessage( { type: "done" } );
	};
	const city_data = e.data[ 0 ] as CityModel | CityFeature;
	parser.parse( city_data );
};

// ---
