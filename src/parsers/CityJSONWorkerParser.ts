//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
// SPDX-FileContributor: Stelios Vitalis (from cityjson-threejs-loader)
//
// SPDX-License-Identifier: Apache-2.0
//

// ---

import { Group, Matrix4, ShaderLib } from 'three';
import { 
	default_object_colors, 
	default_semantics_colors,
	default_layers_colors
} from '../materials/colors';
import { POINTS, LINES, TRIANGLES, GeometryData } from './GeometryData';
import 'three/examples/jsm/lines/LineMaterial';
import { CityObjectsMeshMaterial, DisplayMode } from '../materials/CityObjectsMeshMaterial';
import { CityObjectsMesh } from '../objects/CityObjectsMesh';
import { CityObjectsLines } from '../objects/CityObjectsLines';
import { CityObjectsPoints } from '../objects/CityObjectsPoints';
import { CityObjectsLineMaterial } from '../materials/CityObjectsLineMaterial';
import { CityObjectsPointsMaterial } from '../materials/CityObjectsPointsMaterial';
import { TriangleParser } from './TriangleParser';
import { LineParser } from './LineParser';
import { PointParser } from './PointParser';
import { CityObjectsInstancedMesh, ObjectInstance } from '../objects/CityObjectsInstancedMesh';
import { toRaw } from 'vue';
import { CityModel, CityFeature, CityJSONGeometryLevelOfDetail } from 'openbeers';
import { ParserConfig, ParserMessage } from './ParserWorker';

// ---

// convert nested proxies to objects

function to_raw_deep(
	data : any
) : any {
	const val = toRaw(data);
	if (Array.isArray(val)) {
		return val.map(to_raw_deep);
	}
	if (val === null) return null;
	if (typeof val === 'object') {
		const entries = Object.entries(val).map(([key, val]) => [key, to_raw_deep(val)]);
		return Object.fromEntries(entries);
	}
	return val;
}

// ---

/**
 * A parser that uses a WebWorker to parse chunks of CityJSON on the background.
 */

export class CityJSONWorkerParser {

    matrix: Matrix4 | null
    chunk_size: number
    loading: boolean
    lods: Array<CityJSONGeometryLevelOfDetail>
    object_colors : {[key: string]: number}
    surface_colors : {[key: string]: number}
	layer_colors : {[key: string]: number}
    on_chunk_load : (() => void )| null
    on_complete: (() => void )| null
    mesh_material : CityObjectsMeshMaterial
    line_material : CityObjectsLineMaterial
    points_material : CityObjectsPointsMaterial

    constructor(
		display_mode : DisplayMode = DisplayMode.solid_thick_lines,
		threshold_angle : number = 30,
		line_thickness : number = 1.0
	) {
		this.matrix = null;
		this.on_chunk_load = null;
		this.on_complete = null;
		this.chunk_size = 2000;
		this.loading = false;
		this.object_colors = default_object_colors;
		this.surface_colors = default_semantics_colors;
		this.layer_colors = default_layers_colors;
		this.lods = [];
		this.mesh_material = new CityObjectsMeshMaterial(
			ShaderLib.lambert, 
			{
				object_colors: this.object_colors,
				surface_colors: this.surface_colors,
				layer_colors: this.layer_colors
			},
			display_mode,
			threshold_angle,
			line_thickness
		);
		this.line_material = new CityObjectsLineMaterial(
			ShaderLib.line,
			{
				color: 0xffffff,
				linewidth: 0.001,
				object_colors: this.object_colors,
				surface_colors: this.surface_colors,
				layer_colors: this.layer_colors
			}
		);
		this.points_material = new CityObjectsPointsMaterial(
			ShaderLib.points,
			{
				size: 10,
				object_colors: this.object_colors,
				surface_colors: this.surface_colors,
				layer_colors: this.layer_colors
			}
		);
	}

	set_materials_colors( 
        object_colors : {[key: string]: number},
        surface_colors : {[key: string]: number},
        layer_colors : {[key: string]: number}
    ) : void {
		this.mesh_material.object_colors = object_colors;
		this.mesh_material.surface_colors = surface_colors;
		this.mesh_material.layer_colors = layer_colors;
		this.line_material.object_colors = object_colors;
		this.line_material.surface_colors = surface_colors;
		this.line_material.layer_colors = layer_colors;
		this.points_material.object_colors = object_colors;
		this.points_material.surface_colors = surface_colors;
		this.points_material.layer_colors = layer_colors;
	}

	parse( 
		city_data : CityModel| CityFeature, 
		scene : Group 
	) : void {
		if ( city_data.city_objects === undefined ) {
			return;
		}
		this.loading = true;
		const worker = new Worker(
			new URL( "./ParserWorker.js", import.meta.url ),
			{ type: "module" }
		);
		const m = this.matrix;
		const on_chunk_load = this.on_chunk_load;
		const on_complete = this.on_complete;
		const context = this;
		worker.onmessage = function ( e : MessageEvent<ParserMessage> ) {
			const parser_message : ParserMessage = e.data;
			if ( parser_message.type === "chunk_loaded" ) {
				context.set_materials_colors(
					parser_message.object_colors, 
					parser_message.surface_colors,
					parser_message.layer_colors
				);
				context.lods = parser_message.lods;
				context.object_colors = parser_message.object_colors;
				context.surface_colors = parser_message.surface_colors;
				context.layer_colors = parser_message.layer_colors;
				if ( parser_message.geometry_data_dump.geometry_type == TRIANGLES ) {
					const mesh = new CityObjectsMesh(
						parser_message.vertex_buffer,
						parser_message.geometry_data_dump, m, context.mesh_material );
					scene.add( mesh );
				} else if ( parser_message.geometry_data_dump.geometry_type == LINES ) {
					const lines = new CityObjectsLines(
						parser_message.vertex_buffer,
						parser_message.geometry_data_dump, m, context.line_material );
					scene.add( lines );
				} else if ( parser_message.geometry_data_dump.geometry_type == POINTS ) {
					const points = new CityObjectsPoints(
						parser_message.vertex_buffer,
						parser_message.geometry_data_dump, m, context.points_material );
					scene.add( points );
				}
				if ( on_chunk_load ) {
					on_chunk_load();
				}
			} else if ( parser_message.type === "done" ) {
				context.loading = false;
				if ( city_data.appearance && city_data.appearance.materials ) {
					context.mesh_material.materials = city_data.appearance.materials;
				}
				if ( on_complete ) {
					on_complete();
				}
			}

		};
		const parser_config : ParserConfig = { 
			chunk_size: this.chunk_size,
			object_colors: toRaw(this.object_colors),
			lods: toRaw(this.lods)
		};
		worker.postMessage( [ 
			to_raw_deep(city_data) as CityModel | CityFeature,
			parser_config
		] );
		// Parse geometry templates
		if ( 
			city_data.type == "CityJSON" &&
			city_data.geometry_templates &&
			city_data.city_objects &&
			city_data.geometry_templates.vertices_templates
		) {
			const templates_geometry_data : Array<GeometryData> = [];
			const vertices : number[][] = city_data.geometry_templates.vertices_templates;
			const city_objects_ids : Array<string> = Object.keys( city_data.city_objects );
			const geometry_parsers = [
				new TriangleParser(
					city_data,
					city_objects_ids, 
					this.object_colors, 
					vertices 
				),
				new LineParser( 
					city_data,
					city_objects_ids, 
					this.object_colors, 
					vertices 
				),
				new PointParser( 
					city_data, 
					city_objects_ids, 
					this.object_colors, 
					vertices 
				)
			];
			for ( const template of city_data.geometry_templates.templates ) {
				for ( const geometry_parser of geometry_parsers ) {
					geometry_parser.lods = this.lods;
					geometry_parser.parse_geometry( template, "", - 1 );
					this.lods = geometry_parser.lods;
					if ( geometry_parser.geometry_data.count() > 0 ) {
						templates_geometry_data.push( geometry_parser.geometry_data );
					}
					geometry_parser.clean();
				}
			}
			const instances : Array<ObjectInstance> = [];
			for ( let i = 0; i < templates_geometry_data.length; i ++ ) {
				const instance : ObjectInstance = {
					matrices: [],
					object_ids: [],
					object_type: [],
					geometry_ids: []
				}
				instances.push( instance );
			}
			for ( const city_object_id in city_data.city_objects ) {
				const city_object = city_data.city_objects[ city_object_id ];
				if ( city_object.geometry && city_object.geometry.length > 0 ) {
					for ( let i = 0; i < city_object.geometry.length; i ++ ) {
						const geometry = city_object.geometry[ i ];
						if ( 
							geometry.type == "GeometryInstance" &&
							geometry.transformation_matrix &&
							geometry.transformation_matrix.length == 16 &&
							city_data.vertices &&
							geometry.template != null &&
							geometry.template !== undefined
						 ) {
							const matrix = new Matrix4();
							const boundaries = geometry.boundaries as number[];
							const object_id : number = Object.keys( city_data.city_objects ).indexOf( city_object_id );
							const object_type : number = Object.keys( this.object_colors ).indexOf( 
								String(city_object.type)
							);
							// @ts-ignore
							matrix.set( ... (geometry.transformation_matrix as []) );
							// @ts-ignore
							matrix.setPosition( ... (city_data.vertices[ boundaries[ 0 ] ] as []) );
							instances[ geometry.template ].matrices.push( matrix );
							instances[ geometry.template ].object_ids.push( object_id );
							instances[ geometry.template ].object_type.push( object_type );
							instances[ geometry.template ].geometry_ids.push( i );
						}
					}
				}
			}
			for ( let i = 0; i < templates_geometry_data.length; i ++ ) {
				const vertex_array = new Float32Array( templates_geometry_data[ i ].get_vertices( vertices ) );
				const vertex_buffer : ArrayBuffer = vertex_array.buffer;
				if ( templates_geometry_data[ i ].geometry_type == TRIANGLES ) {
					const mesh = new CityObjectsInstancedMesh(
						vertex_buffer,
						templates_geometry_data[ i ],
						instances[ i ],
						this.matrix,
						this.mesh_material
					);
					scene.add( mesh );
				} else if ( templates_geometry_data[ i ].geometry_type == LINES ) {
					for ( let j = 0; j < instances[ i ].matrices.length; j ++ ) {
						templates_geometry_data[ i ].set_object_id( instances[ i ].object_ids[ j ] );
						templates_geometry_data[ i ].set_object_type( instances[ i ].object_type[ j ] );
						templates_geometry_data[ i ].set_geometry_idx( instances[ i ].geometry_ids[ j ] );
						const line = new CityObjectsLines( 
							vertex_buffer,
							templates_geometry_data[ i ],
							this.matrix,
							this.line_material
						);
						line.applyMatrix4( instances[ i ].matrices[ j ] );
						scene.add( line );
					}

				} else if ( templates_geometry_data[ i ].geometry_type == POINTS ) {
					for ( let j = 0; j < instances[ i ].matrices.length; j ++ ) {
						templates_geometry_data[ i ].set_object_id( instances[ i ].object_ids[ j ] );
						templates_geometry_data[ i ].set_object_type( instances[ i ].object_type[ j ] );
						templates_geometry_data[ i ].set_geometry_idx( instances[ i ].geometry_ids[ j ] );
						const line = new CityObjectsPoints(
							vertex_buffer,
							templates_geometry_data[ i ],
							this.matrix,
							this.points_material
						);
						line.applyMatrix4( instances[ i ].matrices[ j ] );
						scene.add( line );
					}
				}
			}
		}
	}
}

// ---
